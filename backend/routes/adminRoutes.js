import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import express from 'express';
import { pool } from '../config/db.js';
import { createAdminToken, requireAdmin } from '../middleware/adminAuth.js';
import { refreshNseAccountStatus } from './panRoutes.js';
import {
  callNseMfss,
  formatNseDate,
  getReportValue,
  loadNseSchemes,
  loadPlanReport,
  readNseReport,
} from './mutualFundRoutes.js';
import {
  ensureMfPublicationSettings,
  getSchemeCategoryIds,
  getSchemeCategoryLabels,
  getUniqueSchemeCodesForCategory,
  getSchemeCollectionIds,
  MF_PUBLICATION_CATEGORIES,
  MF_PUBLICATION_COLLECTIONS,
  readMfPublicationSettings,
} from '../utils/mfPublication.js';

const router = express.Router();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const loginAttempts = new Map();
const MF_OVERVIEW_CACHE_TTL_MS = 90 * 1000;
const MF_OVERVIEW_USER_LIMIT = 20;
const MF_OVERVIEW_REPORT_CONCURRENCY = 8;
const REDEMPTIONS_REPORT_CHUNK_DAYS = 30;
let mfOverviewCache = null;
let mfOverviewInFlight = null;
let redemptionsLifetimeCache = null;
let redemptionsLifetimeInFlight = null;

function parseReportAmount(value) {
  const normalized = String(value || '').replace(/[₹,\s]/g, '');
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function parseReportDate(value) {
  const raw = String(value || '').trim();
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? raw
    : /^(\d{2})-(\d{2})-(\d{4})$/.test(raw)
      ? `${raw.slice(6)}-${raw.slice(3, 5)}-${raw.slice(0, 2)}`
      : '';
  if (!iso) return '';
  const parsed = new Date(`${iso}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== iso
    ? ''
    : iso;
}

function normalizeAdminPlan(type, row, clientName) {
  const status = String(row.status || '').trim().slice(0, 40) || 'Not reported';
  return {
    type,
    status,
    schemeName: String(row.schemeName || row.fromSchemeName || row.toSchemeName || '').slice(0, 160),
    registrationId: String(row.registrationId || '').trim().slice(0, 80),
    schemeCode: String(row.schemeCode || '').trim().slice(0, 40),
    amount: parseReportAmount(row.amount),
    frequency: String(row.frequency || '').trim().slice(0, 40),
    startDate: parseReportDate(row.startDate),
    endDate: parseReportDate(row.endDate),
    nextInstallmentDate: parseReportDate(row.nextInstallmentDate),
    installmentCount: String(row.installmentCount || '').trim().slice(0, 20),
    clientName: String(clientName || '').trim().slice(0, 120),
    actionNeeded: /\b(failed|rejected|pending)\b/i.test(`${status} ${row.remark || ''}`),
    actionReason: /\b(failed|rejected)\b/i.test(`${status} ${row.remark || ''}`)
      ? 'Report indicates a failed or rejected item'
      : 'Report indicates a pending item',
  };
}

function normalizeAdminActivity(row, clientName) {
  const transactionType = String(getReportValue(row, ['transaction_type', 'trxn_type']) || '').trim().slice(0, 40);
  const orderType = String(getReportValue(row, ['ordertype', 'order_type']) || '').trim().slice(0, 40);
  const classification = `${transactionType} ${orderType}`;
  return {
    type: 'activity',
    transactionType,
    orderType,
    schemeName: String(getReportValue(row, ['schemename', 'scheme_name']) || '').slice(0, 160),
    amount: parseReportAmount(getReportValue(row, ['allotmentamt', 'allotment_amount', 'amount'])),
    date: parseReportDate(getReportValue(row, ['reportdate', 'allotment_date', 'orderdate', 'order_date'])),
    clientName: String(clientName || '').trim().slice(0, 120),
    category: /\b(redemption|redeem|switch[\s_-]*out)\b/i.test(classification)
      ? 'redemption'
      : /\b(lumpsum|one[\s_-]*time)\b/i.test(classification)
        ? 'lumpsum'
        : 'other',
  };
}

async function loadAdminMfOverview() {
  const [countResult, usersResult] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM users
       WHERE COALESCE(nse_ucc_registered, FALSE) = TRUE
         AND NULLIF(BTRIM(nse_client_code), '') IS NOT NULL`,
    ),
    pool.query(
      `SELECT nse_client_code, first_name, last_name
       FROM users
       WHERE COALESCE(nse_ucc_registered, FALSE) = TRUE
         AND NULLIF(BTRIM(nse_client_code), '') IS NOT NULL
       ORDER BY id
       LIMIT $1`,
      [MF_OVERVIEW_USER_LIMIT],
    ),
  ]);
  const eligibleUsers = countResult.rows[0]?.total || 0;
  const clients = usersResult.rows;
  const today = new Date().toISOString().slice(0, 10);
  const fromDate = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const reportTypes = ['sip', 'stp', 'swp', 'activity'];
  const reportCoverage = Object.fromEntries(reportTypes.map((type) => [type, {
    succeeded: 0,
    failed: 0,
    requested: clients.length,
  }]));
  const plans = [];
  const activity = [];
  const jobs = clients.flatMap((user) => {
    const clientCode = String(user.nse_client_code || '').trim();
    return [
      ...['sip', 'stp', 'swp'].map((type) => async () => {
        const rows = await loadPlanReport(type, clientCode);
        const clientName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
        plans.push(...rows.map((row) => normalizeAdminPlan(type, row, clientName)));
      }),
      async () => {
        const content = await callNseMfss(
          '/nsemfdesk/api/v2/reports/ALLOTMENT_STATEMENT',
          {
            order_ids: '',
            from_date: formatNseDate(fromDate),
            to_date: formatNseDate(today),
            order_type: 'ALL',
            sub_order_type: 'ALL',
            client_code: clientCode,
            transaction_type: '',
            order_status: 'VALID',
            settlement_type: 'ALL',
            date_type: 'ALT_DATE',
            member_unique_ids: '',
          },
          'Dhanvo-NSE-MF-Admin-Overview/1.0',
        );
        const reportRows = readNseReport(content, 'allotment activity');
        const clientName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
        activity.push(...reportRows.map((row) => normalizeAdminActivity(row, clientName)));
      },
    ].map((run, index) => ({ run, type: index < 3 ? ['sip', 'stp', 'swp'][index] : 'activity' }));
  });

  let nextJob = 0;
  const workers = Array.from(
    { length: Math.min(MF_OVERVIEW_REPORT_CONCURRENCY, jobs.length) },
    async () => {
      while (nextJob < jobs.length) {
        const job = jobs[nextJob];
        nextJob += 1;
        try {
          await job.run();
          reportCoverage[job.type].succeeded += 1;
        } catch {
          reportCoverage[job.type].failed += 1;
        }
      }
    },
  );
  await Promise.all(workers);

  return {
    source: 'Live NSE SIP, STP, SWP registration and allotment reports',
    lastUpdated: new Date().toISOString(),
    window: { fromDate, toDate: today, days: 30 },
    coverage: {
      eligibleUsers,
      attemptedUsers: clients.length,
      userLimit: MF_OVERVIEW_USER_LIMIT,
      limited: eligibleUsers > clients.length,
      partial: eligibleUsers > clients.length
        || Object.values(reportCoverage).some((item) => item.failed > 0),
      reports: reportCoverage,
    },
    plans,
    activity,
  };
}

async function loadAdminRedemptionsLifetime() {
  const [countResult, usersResult] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM users
       WHERE COALESCE(nse_ucc_registered, FALSE) = TRUE
         AND NULLIF(BTRIM(nse_client_code), '') IS NOT NULL`,
    ),
    pool.query(
      `SELECT nse_client_code, first_name, last_name,
              COALESCE(nse_ucc_registered_at, created_at)::date::text AS activity_from
       FROM users
       WHERE COALESCE(nse_ucc_registered, FALSE) = TRUE
         AND NULLIF(BTRIM(nse_client_code), '') IS NOT NULL
       ORDER BY id
       LIMIT $1`,
      [MF_OVERVIEW_USER_LIMIT],
    ),
  ]);
  const eligibleUsers = countResult.rows[0]?.total || 0;
  const clients = usersResult.rows;
  const today = new Date().toISOString().slice(0, 10);
  const activity = [];
  const incompleteChunks = [];
  const accountCoverage = clients.map((user) => {
    const fromDate = parseReportDate(user.activity_from);
    const clientName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || 'Not reported';
    return {
      clientName,
      fromDate,
      toDate: today,
      requestedChunks: 0,
      succeededChunks: 0,
      failedChunks: 0,
      invalidStartDate: !fromDate || fromDate > today,
    };
  });
  const jobs = [];

  accountCoverage.forEach((account, accountIndex) => {
    if (account.invalidStartDate) return;
    let chunkStart = account.fromDate;
    while (chunkStart <= today) {
      const lastIncludedDate = new Date(`${chunkStart}T00:00:00.000Z`);
      lastIncludedDate.setUTCDate(lastIncludedDate.getUTCDate() + REDEMPTIONS_REPORT_CHUNK_DAYS - 1);
      const chunkEnd = lastIncludedDate.toISOString().slice(0, 10);
      const chunkTo = chunkEnd < today ? chunkEnd : today;
      const requestFrom = chunkStart;
      const requestTo = chunkTo;
      const clientCode = String(clients[accountIndex].nse_client_code || '').trim();
      account.requestedChunks += 1;
      jobs.push({
        account,
        fromDate: requestFrom,
        toDate: requestTo,
        run: async () => {
          const content = await callNseMfss(
            '/nsemfdesk/api/v2/reports/ALLOTMENT_STATEMENT',
            {
              order_ids: '',
              from_date: formatNseDate(requestFrom),
              to_date: formatNseDate(requestTo),
              order_type: 'ALL',
              sub_order_type: 'ALL',
              client_code: clientCode,
              transaction_type: '',
              order_status: 'VALID',
              settlement_type: 'ALL',
              date_type: 'ALT_DATE',
              member_unique_ids: '',
            },
            'Dhanvo-NSE-MF-Redemptions-Lifetime/1.0',
          );
          const reportRows = readNseReport(content, 'allotment activity');
          activity.push(...reportRows.map((row) => normalizeAdminActivity(row, account.clientName)));
        },
      });
      const nextStart = new Date(`${chunkTo}T00:00:00.000Z`);
      nextStart.setUTCDate(nextStart.getUTCDate() + 1);
      chunkStart = nextStart.toISOString().slice(0, 10);
    }
  });

  let nextJob = 0;
  const workers = Array.from(
    { length: Math.min(MF_OVERVIEW_REPORT_CONCURRENCY, jobs.length) },
    async () => {
      while (nextJob < jobs.length) {
        const job = jobs[nextJob];
        nextJob += 1;
        try {
          await job.run();
          job.account.succeededChunks += 1;
        } catch {
          job.account.failedChunks += 1;
          incompleteChunks.push({
            clientName: job.account.clientName,
            fromDate: job.fromDate,
            toDate: job.toDate,
          });
        }
      }
    },
  );
  await Promise.all(workers);

  const failedAccounts = accountCoverage.filter(
    (account) => account.invalidStartDate || account.failedChunks > 0,
  );
  const requestedChunks = jobs.length;
  const succeededChunks = accountCoverage.reduce((total, account) => total + account.succeededChunks, 0);
  const failedChunks = accountCoverage.reduce((total, account) => total + account.failedChunks, 0);
  const validStarts = accountCoverage.map((account) => account.fromDate).filter(Boolean);
  const fromDate = validStarts.length ? validStarts.sort()[0] : null;
  const limited = eligibleUsers > clients.length;
  const partial = limited || failedAccounts.length > 0;

  return {
    source: 'Live NSE allotment activity reports',
    lastUpdated: new Date().toISOString(),
    window: { fromDate, toDate: today, scope: 'lifetime', chunkDays: REDEMPTIONS_REPORT_CHUNK_DAYS },
    coverage: {
      eligibleUsers,
      attemptedUsers: clients.length,
      userLimit: MF_OVERVIEW_USER_LIMIT,
      limited,
      partial,
      accounts: {
        requested: clients.length,
        succeeded: clients.length - failedAccounts.length,
        failed: failedAccounts.length,
        items: accountCoverage,
      },
      chunks: {
        requested: requestedChunks,
        succeeded: succeededChunks,
        failed: failedChunks,
        incomplete: incompleteChunks,
      },
      reports: {
        activity: {
          requested: requestedChunks,
          succeeded: succeededChunks,
          failed: failedChunks,
        },
      },
      incompleteAccounts: failedAccounts.map((account) => ({
        clientName: account.clientName,
        fromDate: account.fromDate || null,
        toDate: account.toDate,
        failedChunks: account.failedChunks,
        invalidStartDate: account.invalidStartDate,
      })),
    },
    activity,
  };
}

function getLoginAttemptState(key, now = Date.now()) {
  const current = loginAttempts.get(key);
  if (!current || current.windowStartedAt + LOGIN_WINDOW_MS <= now) {
    if (loginAttempts.size > 10000) {
      for (const [address, attempt] of loginAttempts) {
        if (attempt.windowStartedAt + LOGIN_WINDOW_MS <= now) loginAttempts.delete(address);
      }
      if (loginAttempts.size > 10000) {
        loginAttempts.delete(loginAttempts.keys().next().value);
      }
    }
    const fresh = { count: 0, windowStartedAt: now };
    loginAttempts.set(key, fresh);
    return fresh;
  }
  return current;
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getAdminLoginConfiguration() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const passwordHash = String(process.env.ADMIN_PASSWORD_HASH || '').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL is missing or invalid');
  }
  if (!/^\$2[aby]\$\d{2}\$/.test(passwordHash)) {
    throw new Error('ADMIN_PASSWORD_HASH must be a bcrypt hash');
  }

  return { email, passwordHash };
}

function maskEmail(email) {
  const [localPart, domain] = String(email || '').split('@');
  if (!localPart || !domain) return '';
  return `${localPart[0]}***@${domain}`;
}

function serializeUser(row) {
  const allowedFatcaStatuses = new Set(['SUBMITTED', 'NOT_SUBMITTED', 'FAILED']);
  const storedFatcaStatus = String(row.fatca_status || '').trim().toUpperCase();
  return {
    id: row.id,
    name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
    email: maskEmail(row.email),
    phoneLastFour: String(row.phone || '').slice(-4),
    isVerified: Boolean(row.is_verified),
    nseUccRegistered: Boolean(row.nse_ucc_registered),
    nseStatus: row.nse_status || 'PENDING',
    accountOpeningStatus: row.account_opening_status || 'PENDING',
    fatcaStatus: allowedFatcaStatuses.has(storedFatcaStatus) ? storedFatcaStatus : 'NOT_SUBMITTED',
    createdAt: row.created_at,
  };
}

function maskPan(value) {
  const pan = String(value || '').trim().toUpperCase();
  if (!pan) return '—';
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) return '••••••••••';
  return `${pan.slice(0, 2)}${'•'.repeat(7)}${pan.slice(-1)}`;
}

function maskKycEmail(value) {
  const [localPart, domain] = String(value || '').split('@');
  if (!localPart || !domain) return '—';
  return `${localPart[0]}***@${domain}`;
}

function serializePanCheck(row) {
  return {
    id: row.id,
    maskedPan: maskPan(row.pan),
    maskedEmail: maskKycEmail(row.email),
    phoneLastFour: String(row.phone || '').slice(-4),
    verified: Boolean(row.verified),
    kycStatus: String(row.kyc_status || '').slice(0, 80) || 'Unknown',
    kraName: String(row.kra_name || '').slice(0, 80) || '—',
    createdAt: row.created_at,
  };
}

async function ensureAdminUserColumns() {
  await pool.query(
    `ALTER TABLE users
       ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
       ADD COLUMN IF NOT EXISTS nse_ucc_registered BOOLEAN DEFAULT FALSE,
       ADD COLUMN IF NOT EXISTS nse_status VARCHAR(30) DEFAULT 'PENDING',
       ADD COLUMN IF NOT EXISTS account_opening_status VARCHAR(30) DEFAULT 'PENDING',
       ADD COLUMN IF NOT EXISTS fatca_status VARCHAR(30) DEFAULT 'NOT_SUBMITTED'`
  );
}

async function ensureAdminPanKycTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pan_kyc_checks (
      id SERIAL PRIMARY KEY,
      pan VARCHAR(20),
      email VARCHAR(255),
      phone VARCHAR(20),
      verified BOOLEAN DEFAULT FALSE,
      name VARCHAR(255),
      kyc_status VARCHAR(100),
      status_remark TEXT,
      kra_name VARCHAR(255),
      response_json JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

function addFailedLogin(ipAddress) {
  const state = getLoginAttemptState(ipAddress);
  state.count += 1;
  return MAX_LOGIN_ATTEMPTS - state.count;
}

router.post('/login', async (req, res) => {
  const ipAddress = req.ip || req.socket?.remoteAddress || 'unknown';
  const attempts = getLoginAttemptState(ipAddress);
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    return res.status(429).json({
      success: false,
      message: 'Too many sign-in attempts. Try again in 15 minutes.',
    });
  }

  try {
    const { email, passwordHash } = getAdminLoginConfiguration();
    const submittedEmail = String(req.body?.email || '').trim().toLowerCase();
    const submittedPassword = String(req.body?.password || '');
    const passwordWithinLimit = Buffer.byteLength(submittedPassword, 'utf8') <= 72;
    const passwordMatches = await bcrypt.compare(passwordWithinLimit ? submittedPassword : '', passwordHash);
    const emailMatches = safeEqual(submittedEmail, email);
    if (!emailMatches || !passwordMatches || !passwordWithinLimit) {
      addFailedLogin(ipAddress);
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    loginAttempts.delete(ipAddress);
    let token;
    try {
      token = createAdminToken(email);
    } catch (error) {
      console.error('Admin token configuration error:', error.message);
      return res.status(503).json({
        success: false,
        message: 'Admin access is not configured on the server',
      });
    }

    return res.json({
      success: true,
      data: { token },
    });
  } catch (error) {
    console.error('Admin configuration error:', error.message);
    return res.status(503).json({
      success: false,
      message: 'Admin access is not configured on the server',
    });
  }
});

router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    await ensureAdminUserColumns();
    await ensureAdminPanKycTable();
    const [userMetrics, panMetrics] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS total_users,
                COUNT(*) FILTER (WHERE COALESCE(nse_ucc_registered, FALSE) = FALSE)::int AS unregistered_ucc,
                COUNT(*) FILTER (WHERE COALESCE(nse_ucc_registered, FALSE) = TRUE)::int AS registered_ucc,
                COUNT(*) FILTER (WHERE COALESCE(is_verified, FALSE) = TRUE)::int AS verified_users,
                COUNT(*) FILTER (WHERE COALESCE(is_verified, FALSE) = FALSE)::int AS unverified_users,
                COUNT(*) FILTER (
                  WHERE COALESCE(nse_ucc_registered, FALSE) = FALSE
                    AND (
                      UPPER(BTRIM(COALESCE(nse_status, ''))) IN ('FAILED', 'REJECTED')
                      OR UPPER(BTRIM(COALESCE(account_opening_status, ''))) IN ('FAILED', 'REJECTED')
                    )
                )::int AS failed_account_processes
         FROM users`
      ),
      pool.query('SELECT COUNT(*)::int AS total_checks FROM pan_kyc_checks'),
    ]);
    const users = await pool.query(
      `SELECT id, first_name, last_name, email, phone, is_verified, fatca_status,
              nse_ucc_registered, nse_status, account_opening_status, created_at
       FROM users
       ORDER BY created_at DESC, id DESC
       LIMIT 50`
    );

    return res.json({
      success: true,
      data: {
        metrics: {
          registeredUsers: userMetrics.rows[0].total_users,
          unregisteredUcc: userMetrics.rows[0].unregistered_ucc,
          registeredUcc: userMetrics.rows[0].registered_ucc,
          verifiedUsers: userMetrics.rows[0].verified_users,
          unverifiedUsers: userMetrics.rows[0].unverified_users,
          failedAccountProcesses: userMetrics.rows[0].failed_account_processes,
          panChecks: panMetrics.rows[0].total_checks,
        },
        users: users.rows.map(serializeUser),
        userPage: {
          total: userMetrics.rows[0].total_users,
          limit: 50,
          offset: 0,
        },
        refreshedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Admin dashboard data error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to load admin dashboard data',
    });
  }
});

router.get('/mutual-funds/overview', requireAdmin, async (req, res) => {
  const forceRefresh = String(req.query.refresh || '') === '1';
  if (!forceRefresh && mfOverviewCache && Date.now() - mfOverviewCache.cachedAt < MF_OVERVIEW_CACHE_TTL_MS) {
    return res.json({ success: true, data: mfOverviewCache.data });
  }

  try {
    if (!mfOverviewInFlight) {
      mfOverviewInFlight = loadAdminMfOverview()
        .then((data) => {
          mfOverviewCache = { cachedAt: Date.now(), data };
          return data;
        })
        .finally(() => {
          mfOverviewInFlight = null;
        });
    }
    const data = await mfOverviewInFlight;
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Admin MF overview error:', error.message);
    return res.status(502).json({
      success: false,
      message: 'Unable to load the NSE mutual fund overview. Please retry.',
    });
  }
});

router.get('/mutual-funds/categories/settings', requireAdmin, async (req, res) => {
  try {
    const [catalogue, settings] = await Promise.all([
      loadNseSchemes(String(req.query.refresh || '') === '1'),
      readMfPublicationSettings(),
    ]);
    const schemeCounts = Object.fromEntries(MF_PUBLICATION_CATEGORIES.map(({ id }) => [id, 0]));
    const schemeRows = catalogue.data.schemes.map((scheme) => {
      const schemeCode = String(scheme.schemeCode || '').trim();
      const categoryIds = getSchemeCategoryIds(scheme);
      categoryIds.forEach((id) => {
        schemeCounts[id] += 1;
      });
      return {
        ...scheme,
        schemeCode,
        categoryIds,
        categoryLabels: getSchemeCategoryLabels(scheme),
        collectionIds: getSchemeCollectionIds(scheme),
        fundEnabled: !schemeCode || settings.fundVisibility?.[schemeCode] !== false,
        hasSchemeCode: Boolean(schemeCode),
      };
    });
    const schemeCodeCounts = schemeRows.reduce((counts, scheme) => {
      if (scheme.schemeCode) counts[scheme.schemeCode] = (counts[scheme.schemeCode] || 0) + 1;
      return counts;
    }, {});

    return res.json({
      success: true,
      data: {
        schemes: schemeRows.map((scheme) => ({
          ...scheme,
          duplicateSchemeCode: schemeCodeCounts[scheme.schemeCode] > 1,
        })),
        categories: MF_PUBLICATION_CATEGORIES.map(({ id, label }) => ({
          id,
          label,
          enabled: settings.categoryVisibility?.[id] !== false,
          schemeCount: schemeCounts[id],
        })),
        collections: MF_PUBLICATION_COLLECTIONS.map(({ id, label }) => ({
          id,
          label,
          enabled: settings.collectionVisibility?.[id] !== false,
          schemeCount: catalogue.data.schemes.filter(
            (scheme) => getSchemeCollectionIds(scheme).includes(id),
          ).length,
        })),
        featuredPicksEnabled: settings.featuredPicksEnabled !== false,
        lastUpdated: catalogue.data.lastUpdated,
      },
    });
  } catch (error) {
    console.error('Admin MF category settings load error:', error.message);
    return res.status(502).json({
      success: false,
      message: 'Unable to load the NSE catalogue and mutual fund publication settings. Please retry.',
    });
  }
});

router.patch('/mutual-funds/categories/settings', requireAdmin, async (req, res) => {
  const { type, id, enabled } = req.body || {};
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ success: false, message: 'A boolean enabled value is required.' });
  }

  const validCategoryIds = new Set(MF_PUBLICATION_CATEGORIES.map(({ id: categoryId }) => categoryId));
  const validCollectionIds = new Set(MF_PUBLICATION_COLLECTIONS.map(({ id: collectionId }) => collectionId));
  const settingId = String(id || '').trim();
  const validFundCode = type === 'fund'
    && settingId.length > 0
    && settingId.length <= 50
    && /^[a-zA-Z0-9._-]+$/.test(settingId);
  const validSetting = (
    type === 'category' && validCategoryIds.has(settingId)
  ) || (
    type === 'category-funds' && validCategoryIds.has(settingId)
  ) || (
    type === 'collection' && validCollectionIds.has(settingId)
  ) || validFundCode || type === 'featured-picks';
  if (!validSetting) {
    return res.status(400).json({ success: false, message: 'The publication setting is not recognized.' });
  }

  try {
    await ensureMfPublicationSettings();
    let result;
    let updatedCount = 1;
    if (type === 'featured-picks') {
      result = await pool.query(
        `UPDATE mf_explorer_publication_settings
         SET settings = jsonb_set(settings, '{featuredPicksEnabled}', to_jsonb($1::boolean), TRUE),
             updated_at = NOW()
         WHERE id = 1
         RETURNING settings`,
        [enabled],
      );
    } else if (type === 'category-funds') {
      const catalogue = await loadNseSchemes();
      const schemeCodes = getUniqueSchemeCodesForCategory(catalogue.schemes, settingId);
      if (!schemeCodes.length) {
        return res.json({
          success: true,
          data: { updated: false, updatedCount: 0 },
        });
      }
      const updates = Object.fromEntries(schemeCodes.map((schemeCode) => [schemeCode, enabled]));
      updatedCount = schemeCodes.length;
      result = await pool.query(
        `UPDATE mf_explorer_publication_settings
         SET settings = jsonb_set(
               settings,
               '{fundVisibility}',
               (CASE
                 WHEN jsonb_typeof(settings -> 'fundVisibility') = 'object'
                 THEN settings -> 'fundVisibility'
                 ELSE '{}'::jsonb
               END) || $1::jsonb,
               TRUE
             ),
             updated_at = NOW()
         WHERE id = 1
         RETURNING settings`,
        [JSON.stringify(updates)],
      );
    } else {
      const key = {
        category: 'categoryVisibility',
        fund: 'fundVisibility',
        collection: 'collectionVisibility',
      }[type];
      result = await pool.query(
        `UPDATE mf_explorer_publication_settings
         SET settings = jsonb_set(
               settings,
               $1::text[],
               COALESCE(settings -> $2, '{}'::jsonb) || jsonb_build_object($3::text, $4::boolean),
               TRUE
             ),
             updated_at = NOW()
         WHERE id = 1
         RETURNING settings`,
        [[key], key, settingId, enabled],
      );
    }

    return res.json({
      success: true,
      data: { updated: true, updatedCount, settings: result.rows[0]?.settings || {} },
    });
  } catch (error) {
    console.error('Admin MF category setting update error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to save this Explorer publication setting. No change was confirmed.',
    });
  }
});

router.get('/redemptions/lifetime', requireAdmin, async (req, res) => {
  const forceRefresh = String(req.query.refresh || '') === '1';
  if (
    !forceRefresh
    && redemptionsLifetimeCache
    && Date.now() - redemptionsLifetimeCache.cachedAt < MF_OVERVIEW_CACHE_TTL_MS
  ) {
    return res.json({ success: true, data: redemptionsLifetimeCache.data });
  }

  try {
    if (!redemptionsLifetimeInFlight) {
      redemptionsLifetimeInFlight = loadAdminRedemptionsLifetime()
        .then((data) => {
          redemptionsLifetimeCache = { cachedAt: Date.now(), data };
          return data;
        })
        .finally(() => {
          redemptionsLifetimeInFlight = null;
        });
    }
    const data = await redemptionsLifetimeInFlight;
    return res.json({ success: true, data });
  } catch (error) {
    console.error('Admin lifetime redemptions report error:', error.message);
    return res.status(502).json({
      success: false,
      message: 'Unable to load lifetime NSE redemption activity. Please retry.',
    });
  }
});

router.get('/pan-checks', requireAdmin, async (req, res) => {
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const requestedOffset = Number.parseInt(req.query.offset, 10);
  const limit = Math.min(Math.max(Number.isSafeInteger(requestedLimit) ? requestedLimit : 50, 1), 100);
  const offset = Math.max(Number.isSafeInteger(requestedOffset) ? requestedOffset : 0, 0);
  const verified = String(req.query.verified || 'all');
  if (!['all', 'true', 'false'].includes(verified)) {
    return res.status(400).json({ success: false, message: 'Choose a valid PAN verification filter' });
  }

  try {
    await ensureAdminPanKycTable();
    const result = await pool.query(
      `SELECT id, pan, email, phone, verified, kyc_status, kra_name, created_at
       FROM pan_kyc_checks
       WHERE $1 = 'all' OR verified = ($1 = 'true')
       ORDER BY created_at DESC, id DESC
       LIMIT $2 OFFSET $3`,
      [verified, limit, offset]
    );
    const total = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM pan_kyc_checks
       WHERE $1 = 'all' OR verified = ($1 = 'true')`,
      [verified]
    );

    return res.json({
      success: true,
      data: {
        checks: result.rows.map(serializePanCheck),
        total: total.rows[0].total,
        limit,
        offset,
        verified,
      },
    });
  } catch (error) {
    console.error('Admin PAN checks error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to load PAN KYC check records',
    });
  }
});

router.get('/leads', requireAdmin, async (req, res) => {
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const requestedOffset = Number.parseInt(req.query.offset, 10);
  const limit = Math.min(Math.max(Number.isSafeInteger(requestedLimit) ? requestedLimit : 50, 1), 100);
  const offset = Math.max(Number.isSafeInteger(requestedOffset) ? requestedOffset : 0, 0);
  const search = String(req.query.search || '').trim().slice(0, 100);
  const status = String(req.query.status || 'all').trim().toLowerCase();
  const statusFilterSql = {
    all: '',
    'account-created': ` AND COALESCE(is_verified, FALSE) = FALSE
                         AND COALESCE(nse_ucc_registered, FALSE) = FALSE
                         AND UPPER(COALESCE(nse_status, 'PENDING')) = 'PENDING'
                         AND UPPER(COALESCE(account_opening_status, 'PENDING')) = 'PENDING'`,
    'onboarding-started': ` AND UPPER(COALESCE(nse_status, 'PENDING')) <> 'ACTIVE'
                            AND (COALESCE(is_verified, FALSE) = TRUE
                                 OR COALESCE(nse_ucc_registered, FALSE) = TRUE
                                 OR UPPER(COALESCE(nse_status, 'PENDING')) <> 'PENDING'
                                 OR UPPER(COALESCE(account_opening_status, 'PENDING')) <> 'PENDING')`,
    complete: ` AND UPPER(COALESCE(nse_status, 'PENDING')) = 'ACTIVE'`,
  };
  if (!Object.prototype.hasOwnProperty.call(statusFilterSql, status)) {
    return res.status(400).json({ success: false, message: 'Choose a valid user onboarding filter' });
  }

  try {
    await ensureAdminUserColumns();
    const statusFilter = statusFilterSql[status];
    const [users, total, metrics] = await Promise.all([
      pool.query(
        `SELECT id, first_name, last_name, email, phone, is_verified,
                nse_ucc_registered, nse_status, account_opening_status,
                fatca_status, created_at
         FROM users
         WHERE ($1 = '' OR first_name::text ILIKE '%' || $1 || '%'
                OR last_name::text ILIKE '%' || $1 || '%'
                OR email::text ILIKE '%' || $1 || '%'
                OR COALESCE(phone::text, '') ILIKE '%' || $1 || '%'
                OR id::text = $1)
           ${statusFilter}
         ORDER BY created_at DESC, id DESC
         LIMIT $2 OFFSET $3`,
        [search, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total
         FROM users
         WHERE ($1 = '' OR first_name::text ILIKE '%' || $1 || '%'
                OR last_name::text ILIKE '%' || $1 || '%'
                OR email::text ILIKE '%' || $1 || '%'
                OR COALESCE(phone::text, '') ILIKE '%' || $1 || '%'
                OR id::text = $1)
           ${statusFilter}`,
        [search]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE UPPER(COALESCE(nse_status, 'PENDING')) = 'ACTIVE')::int AS complete,
                COUNT(*) FILTER (
                  WHERE UPPER(COALESCE(nse_status, 'PENDING')) <> 'ACTIVE'
                    AND (COALESCE(is_verified, FALSE) = TRUE
                         OR COALESCE(nse_ucc_registered, FALSE) = TRUE
                         OR UPPER(COALESCE(nse_status, 'PENDING')) <> 'PENDING'
                         OR UPPER(COALESCE(account_opening_status, 'PENDING')) <> 'PENDING')
                )::int AS onboarding_started
         FROM users`
      ),
    ]);

    return res.json({
      success: true,
      data: {
        leads: users.rows.map((row) => {
          const nseStatus = String(row.nse_status || 'PENDING').trim().toUpperCase();
          const accountOpeningStatus = String(row.account_opening_status || 'PENDING').trim().toUpperCase();
          const stage = nseStatus === 'ACTIVE'
            ? 'complete'
            : row.is_verified || row.nse_ucc_registered || nseStatus !== 'PENDING' || accountOpeningStatus !== 'PENDING'
              ? 'onboarding-started'
              : 'account-created';
          return {
            id: row.id,
            name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Unknown user',
            email: row.email,
            phone: row.phone,
            isVerified: Boolean(row.is_verified),
            nseUccRegistered: Boolean(row.nse_ucc_registered),
            nseStatus,
            accountOpeningStatus,
            fatcaStatus: row.fatca_status || 'NOT_SUBMITTED',
            stage,
            createdAt: row.created_at,
          };
        }),
        total: total.rows[0].total,
        metrics: {
          total: metrics.rows[0].total,
          complete: metrics.rows[0].complete,
          onboardingStarted: metrics.rows[0].onboarding_started,
        },
        limit,
        offset,
        search,
        status,
      },
    });
  } catch (error) {
    console.error('Admin leads error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to load user leads',
    });
  }
});

router.post('/users/:id/refresh-account-opening-status', requireAdmin, async (req, res) => {
  const userId = String(req.params.id || '');
  const numericUserId = Number(userId);
  if (!/^[1-9]\d*$/.test(userId) || !Number.isSafeInteger(numericUserId) || numericUserId > 2147483647) {
    return res.status(400).json({ success: false, message: 'A valid user ID is required' });
  }

  try {
    const result = await refreshNseAccountStatus(numericUserId);
    if (!result.row) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    if (!result.checked) {
      const message = result.report
        ? 'NSE report matched the account but did not include a recognized UCC status. No database status was changed.'
        : result.reportRowsCount
          ? `NSE returned ${result.reportRowsCount} report row(s), but none matched this account by NSE client code or PAN. No database status was changed.`
          : !result.clientCodePresent
            ? 'This account has no NSE client code, so its status could not be checked. No database status was changed.'
            : !result.reportQuerySucceeded
              ? 'The NSE status report could not be retrieved. No database status was changed.'
              : 'NSE did not return a client detail record for this account. No database status was changed.';
      return res.status(502).json({
        success: false,
        message,
      });
    }

    return res.json({
      success: true,
      data: {
        accountOpeningStatus: result.accountOpeningStatus,
        nseStatus: result.nseStatus,
        nseStatusRemark: result.nseStatusRemark,
        nseStatusCheckedAt: result.nseStatusCheckedAt,
        nseUccRegistered: result.isUccRegistered,
        changed: result.changed,
      },
    });
  } catch (error) {
    console.error('Admin NSE account status refresh error:', error.message);
    return res.status(502).json({
      success: false,
      message: 'Unable to verify this account with NSE. The stored account status was not changed.',
    });
  }
});

router.get('/users/:id', requireAdmin, async (req, res) => {
  const userId = String(req.params.id || '');
  const numericUserId = Number(userId);
  if (!/^[1-9]\d*$/.test(userId) || !Number.isSafeInteger(numericUserId) || numericUserId > 2147483647) {
    return res.status(400).json({ success: false, message: 'A valid user ID is required' });
  }

  try {
    await ensureAdminUserColumns();
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, is_verified, fatca_status,
              nse_ucc_registered, nse_status, account_opening_status, created_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      data: serializeUser(result.rows[0]),
    });
  } catch (error) {
    console.error('Admin user detail error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to load admin user details',
    });
  }
});

router.get('/users/:id/activity', requireAdmin, async (req, res) => {
  const userId = String(req.params.id || '');
  const numericUserId = Number(userId);
  if (!/^[1-9]\d*$/.test(userId) || !Number.isSafeInteger(numericUserId) || numericUserId > 2147483647) {
    return res.status(400).json({ success: false, message: 'A valid user ID is required' });
  }
  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
  const requestedFromDate = req.query.fromDate === undefined ? defaultFrom : req.query.fromDate;
  const requestedToDate = req.query.toDate === undefined ? today : req.query.toDate;
  const parseDate = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
      ? null
      : parsed;
  };
  const fromDate = parseDate(requestedFromDate);
  const toDate = parseDate(requestedToDate);
  if (!fromDate || !toDate || fromDate > toDate || toDate > new Date(`${today}T00:00:00.000Z`)) {
    return res.status(400).json({
      success: false,
      message: 'Choose a valid activity date range ending today or earlier.',
    });
  }
  if ((toDate.getTime() - fromDate.getTime()) / 86400000 + 1 > 30) {
    return res.status(400).json({
      success: false,
      message: 'NSE allotment activity can be loaded for a maximum 30-day date range at a time.',
    });
  }

  try {
    const result = await pool.query(
      'SELECT nse_client_code, nse_ucc_registered FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const user = result.rows[0];
    if (!user.nse_ucc_registered || !String(user.nse_client_code || '').trim()) {
      return res.status(403).json({
        success: false,
        message: 'NSE allotment activity is unavailable because this user has no active registered UCC.',
      });
    }
    const from = fromDate.toISOString().slice(0, 10);
    const to = toDate.toISOString().slice(0, 10);
    const content = await callNseMfss(
      '/nsemfdesk/api/v2/reports/ALLOTMENT_STATEMENT',
      {
        order_ids: '',
        from_date: formatNseDate(from),
        to_date: formatNseDate(to),
        order_type: 'ALL',
        sub_order_type: 'ALL',
        client_code: String(user.nse_client_code).trim(),
        transaction_type: '',
        order_status: 'VALID',
        settlement_type: 'ALL',
        date_type: 'ALT_DATE',
        member_unique_ids: '',
      },
      'Dhanvo-NSE-MF-Activity/1.0',
    );
    const activity = readNseReport(content, 'allotment activity').map((row) => ({
      orderId: getReportValue(row, ['orderno', 'order_no', 'order_id']),
      orderDate: getReportValue(row, ['reportdate', 'allotment_date', 'orderdate', 'order_date']),
      schemeCode: getReportValue(row, ['schemecode', 'scheme_code', 'nse_scheme_code']),
      schemeName: getReportValue(row, ['schemename', 'scheme_name']),
      transactionType: getReportValue(row, ['transaction_type', 'trxn_type']),
      orderType: getReportValue(row, ['ordertype', 'order_type']),
      folioNumber: getReportValue(row, ['foliono', 'folio_no', 'folio_number']),
      allottedNav: getReportValue(row, ['allottednav', 'allotted_nav', 'allotment_nav']),
      allottedUnits: getReportValue(row, ['allottedqty', 'allotted_qty', 'allotment_qty']),
      amount: getReportValue(row, ['allotmentamt', 'allotment_amount', 'amount']),
      settlementType: getReportValue(row, ['settlementype', 'settlement_type']),
      date: getReportValue(row, ['reportdate', 'allotment_date', 'orderdate', 'order_date']),
      lastUpdated: getReportValue(row, ['last_updated', 'lastupdated', 'updated_at']),
    }));
    return res.json({
      success: true,
      data: { activity, fromDate: from, toDate: to, lastUpdated: new Date().toISOString() },
    });
  } catch (error) {
    console.error('Admin NSE allotment activity error:', error.message);
    const status = error.statusCode === 401 || error.statusCode === 403
      ? 502
      : String(error.message).startsWith('NSE_NOT_CONFIGURED')
        ? 503
        : error.name === 'TimeoutError' || error.name === 'AbortError'
          ? 504
          : 502;
    return res.status(status).json({
      success: false,
      message: status === 503
        ? 'NSE allotment reporting is not configured on the server'
        : status === 504
          ? 'NSE allotment report timed out; please retry'
          : 'Unable to load NSE allotment activity',
    });
  }
});

router.get('/users', requireAdmin, async (req, res) => {
  try {
    await ensureAdminUserColumns();
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const requestedOffset = Number.parseInt(req.query.offset, 10);
    const limit = Math.min(Math.max(Number.isSafeInteger(requestedLimit) ? requestedLimit : 50, 1), 100);
    const offset = Math.max(Number.isSafeInteger(requestedOffset) ? requestedOffset : 0, 0);
    const search = String(req.query.search || '').trim().slice(0, 100);
    const filter = String(req.query.filter || 'all');
    const filterSql = {
      all: '',
      'ucc-registered': ' AND COALESCE(nse_ucc_registered, FALSE) = TRUE',
      'ucc-unregistered': ' AND COALESCE(nse_ucc_registered, FALSE) = FALSE',
      'pan-verified': ' AND COALESCE(is_verified, FALSE) = TRUE',
      'pan-unverified': ' AND COALESCE(is_verified, FALSE) = FALSE',
    };
    if (!Object.prototype.hasOwnProperty.call(filterSql, filter)) {
      return res.status(400).json({ success: false, message: 'Choose a valid user status filter' });
    }
    const statusFilter = filterSql[filter];
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, is_verified, fatca_status,
              nse_ucc_registered, nse_status, account_opening_status, created_at
       FROM users
       WHERE ($1 = '' OR first_name ILIKE '%' || $1 || '%'
          OR last_name ILIKE '%' || $1 || '%'
          OR email ILIKE '%' || $1 || '%'
          OR id::text = $1)
          ${statusFilter}
       ORDER BY created_at DESC, id DESC
       LIMIT $2 OFFSET $3`,
      [search, limit, offset]
    );
    const total = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM users
       WHERE ($1 = '' OR first_name ILIKE '%' || $1 || '%'
          OR last_name ILIKE '%' || $1 || '%'
          OR email ILIKE '%' || $1 || '%'
          OR id::text = $1)
          ${statusFilter}`,
      [search]
    );

    return res.json({
      success: true,
      data: {
        users: result.rows.map(serializeUser),
        total: total.rows[0].total,
        limit,
        offset,
        filter,
      },
    });
  } catch (error) {
    console.error('Admin users error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to load admin users',
    });
  }
});

export default router;
