import express from 'express';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import { protect } from '../middleware/auth.js';
import { encryptedPassword, getNseConfig, requiredEnv } from '../utils/nseAuth.js';
import { parseNavFile, parseSchemeMaster } from '../utils/nseMutualFunds.js';
import {
  buildPurchaseOrderPayload,
  buildPurchasePaymentPayload,
  getPurchaseAmountError,
  isValidNseEuin,
  validatePurchaseFields,
} from '../utils/nsePurchase.js';
import {
  getPublicMfPublicationSettings,
  isSchemePublished,
  readMfPublicationSettings,
} from '../utils/mfPublication.js';

const router = express.Router();
const CACHE_TTL_MS = 15 * 60 * 1000;
const NAV_DOWNLOAD_PATH = '/nsemfdesk/api/v2/reports/MASTER_DOWNLOAD';
const PLAN_TYPES = {
  sip: {
    report: 'SIP_REG_REPORT',
    register: '/nsemfdesk/api/v2/registration/product/SIP',
    cancel: '/nsemfdesk/api/v2/cancellation/SIP_CAN',
    registrationIdFields: [
      'sip_reg_no',
      'sip_reg_id',
      'sip_registration_no',
      'sip_registration_id',
      'sip_registration_number',
      'reg_id',
      'registration_id',
      'registration_no',
      'registration_number',
    ],
    cancellationIdField: 'sip_reg_no',
    frequencyTypes: ['MONTHLY', 'QUARTERLY', 'SEMI-ANNUALLY', 'ANNUALLY'],
  },
  stp: {
    report: 'STP_REG_REPORT',
    register: '/nsemfdesk/api/v2/registration/product/STP',
    cancel: '/nsemfdesk/api/v2/cancellation/STP_CAN',
    registrationIdFields: [
      'stp_registration_no',
      'stp_registration_number',
      'stp_reg_no',
      'stp_reg_id',
      'stp_registration_id',
      'reg_id',
      'registration_id',
      'registration_no',
      'registration_number',
    ],
    cancellationIdField: 'stp_reg_no',
    frequencyTypes: ['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'QUARTERLY', 'SEMI-ANNUAL', 'ANNUAL'],
  },
  swp: {
    report: 'SWP_REG_REPORT',
    register: '/nsemfdesk/api/v2/registration/product/SWP',
    cancel: '/nsemfdesk/api/v2/cancellation/SWP_CAN',
    registrationIdFields: [
      'swp_registration_no',
      'swp_registration_number',
      'swp_reg_no',
      'swp_reg_id',
      'swp_registration_id',
      'reg_id',
      'registration_id',
      'registration_no',
      'registration_number',
    ],
    cancellationIdField: 'swp_reg_no',
    frequencyTypes: ['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'QUARTERLY', 'SEMI-ANNUAL', 'ANNUAL'],
  },
};
let schemesCache = null;
let mutualFundWatchlistColumnReady;

async function ensureMutualFundWatchlistColumn() {
  if (!mutualFundWatchlistColumnReady) {
    mutualFundWatchlistColumnReady = pool.query(
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS mutual_fund_watchlist JSONB',
    ).catch((error) => {
      mutualFundWatchlistColumnReady = null;
      throw error;
    });
  }
  await mutualFundWatchlistColumnReady;
}

async function loadNseSchemes(forceRefresh = false) {
  if (!forceRefresh && schemesCache && Date.now() - schemesCache.cachedAt < CACHE_TTL_MS) {
    return schemesCache;
  }

  const [schemeFile, navFile] = await Promise.all([
    downloadNseFile('SCH'),
    downloadNseFile('NAV'),
  ]);
  const navByScheme = parseNavFile(navFile);
  if (!navByScheme.size) {
    throw new Error('NSE returned no NAV records');
  }

  const internalSchemes = parseSchemeMaster(schemeFile);
  const schemes = internalSchemes
    .map((scheme) => {
      const nav = navByScheme.get(scheme.schemeCode.toUpperCase())
        || (scheme.isin ? navByScheme.get(scheme.isin) : null);
      return {
        schemeCode: scheme.schemeCode,
        name: scheme.name,
        amcCode: scheme.amcCode,
        amcName: scheme.amcName,
        schemeType: scheme.schemeType,
        schemeCategory: scheme.schemeCategory,
        schemeSubCategory: scheme.schemeSubCategory,
        plan: scheme.plan,
        option: scheme.option,
        isin: scheme.isin,
        purchaseEligible: scheme.purchaseEligible,
        minPurchaseAmount: scheme.minPurchaseAmount,
        maxPurchaseAmount: scheme.maxPurchaseAmount,
        purchaseAmountMultiple: scheme.purchaseAmountMultiple,
        nav: nav?.nav ?? null,
        navDate: nav?.navDate || '',
      };
    })
    .sort((first, second) => first.name.localeCompare(second.name));

  if (!schemes.length) {
    throw new Error('NSE returned no mutual fund schemes');
  }
  if (!schemes.some((scheme) => scheme.nav !== null)) {
    throw new Error('NSE NAV records could not be matched to its scheme master');
  }

  const data = { schemes, lastUpdated: new Date().toISOString() };
  schemesCache = { cachedAt: Date.now(), data, schemes: internalSchemes };
  return schemesCache;
}

async function updateMutualFundWatchlist(userId, update) {
  await ensureMutualFundWatchlistColumn();
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const result = await client.query(
      'SELECT mutual_fund_watchlist FROM users WHERE id = $1 FOR UPDATE',
      [userId],
    );
    if (!result.rows[0]) {
      const error = new Error('Account not found.');
      error.statusCode = 404;
      throw error;
    }

    const savedSchemes = result.rows[0].mutual_fund_watchlist;
    if (savedSchemes !== null && !Array.isArray(savedSchemes)) {
      throw new Error('Saved mutual-fund watchlist data is invalid.');
    }
    const schemeCodes = savedSchemes === null
      ? []
      : [...new Set(savedSchemes.map((code) => String(code).trim()).filter(Boolean))];
    const nextSchemeCodes = update ? update(schemeCodes) : schemeCodes;

    await client.query(
      'UPDATE users SET mutual_fund_watchlist = $1::jsonb WHERE id = $2',
      [JSON.stringify(nextSchemeCodes), userId],
    );
    await client.query('COMMIT');
    return nextSchemeCodes;
  } catch (error) {
    if (transactionStarted) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function sendMutualFundWatchlistError(res, error, message) {
  const statusCode = error.statusCode
    || (error.message.startsWith('NSE_NOT_CONFIGURED:') ? 503 : null)
    || (error.name === 'TimeoutError' || error.name === 'AbortError' ? 504 : null)
    || 500;
  if (!(error.statusCode >= 400 && error.statusCode < 500)) {
    console.error(`${message}:`, error.message);
  }
  const responseMessage = error.statusCode >= 400 && error.statusCode < 500
    ? error.message
    : statusCode === 503
      ? 'NSE API is not configured on the server. Check the backend NSE credentials and member ID.'
      : statusCode === 504
        ? 'NSE mutual fund data request timed out. Please try again.'
        : message;
  return res.status(statusCode).json({
    success: false,
    message: responseMessage,
  });
}

function getReportValue(row, aliases) {
  const normalized = new Map(
    Object.entries(row || {}).map(([key, value]) => [
      key.toLowerCase().replace(/[^a-z0-9]/g, ''),
      value,
    ]),
  );
  for (const alias of aliases) {
    const value = normalized.get(alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

function readNseReport(content, action) {
  const report = parseNseJsonResponse(content, action);
  if (String(report.response_status || '').trim().toUpperCase() !== 'S') {
    const error = new Error(report.error_remark || `NSE could not load ${action}.`);
    error.statusCode = 502;
    throw error;
  }
  if (!Array.isArray(report.report_data)) {
    throw new Error(`NSE returned an invalid ${action} report.`);
  }
  return report.report_data;
}

function formatNseDate(date) {
  const [year, month, day] = date.split('-');
  return `${day}-${month}-${year}`;
}

function parsePlanDate(value) {
  const date = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date
    ? null
    : parsed;
}

function normalizePlanReportRow(type, row) {
  const plan = PLAN_TYPES[type];
  return {
    type,
    registrationId: getReportValue(row, plan.registrationIdFields),
    status: getReportValue(row, [
      'status',
      'reg_status',
      'registration_status',
      `${type}_status`,
      `${type}_reg_status`,
      `${type}_registration_status`,
    ]),
    schemeCode: getReportValue(row, [
      'scheme_code',
      'nse_scheme_code',
      'from_nse_scheme_code',
      'scheme_code_from',
    ]),
    schemeName: getReportValue(row, ['scheme_name', 'schemename']),
    fromSchemeCode: getReportValue(row, ['from_nse_scheme_code', 'from_scheme_code']),
    fromSchemeName: getReportValue(row, ['from_scheme_name']),
    toSchemeCode: getReportValue(row, ['to_nse_scheme_code', 'to_scheme_code']),
    toSchemeName: getReportValue(row, ['to_scheme_name']),
    amount: getReportValue(row, [
      'installment_amount',
      'installmentamount',
      'installment_amt',
      'sip_amount',
      'stp_amount',
      'withdrawl_amount',
      'withdrawal_amount',
    ]),
    units: getReportValue(row, ['installment_units', 'withdrawl_units', 'withdrawal_units']),
    frequency: getReportValue(row, ['frequency_type', 'frequency']),
    startDate: getReportValue(row, [
      'start_date',
      'sip_start_date',
      'stp_start_date',
      'swp_start_date',
      'sip_start_dt',
      'stp_start_dt',
      'swp_start_dt',
    ]),
    endDate: getReportValue(row, [
      'end_date',
      'sip_end_date',
      'stp_end_date',
      'swp_end_date',
      'sip_end_dt',
      'stp_end_dt',
      'swp_end_dt',
    ]),
    nextInstallmentDate: getReportValue(row, ['next_installment_date', 'next_due_date']),
    installmentCount: getReportValue(row, [
      'installment_no',
      'no_of_transfers',
      'no_of_withdrawals',
      'number_of_installments',
    ]),
    folioNumber: getReportValue(row, ['folio_no', 'folio_number']),
    remark: getReportValue(row, ['reg_remark', 'remark', 'remarks']),
  };
}

async function loadPlanReport(type, clientCode) {
  const plan = PLAN_TYPES[type];
  const content = await callNseMfss(
    `/nsemfdesk/api/v2/reports/${plan.report}`,
    { client_code: clientCode },
    'Dhanvo-NSE-MF-Plans/1.0',
  );
  return readNseReport(content, `${type.toUpperCase()} registrations`)
    .map((row) => normalizePlanReportRow(type, row))
    .filter((row) => row.registrationId);
}

async function loadNseClientMaster(clientCode) {
  const content = await callNseMfss(
    '/nsemfdesk/api/v2/reports/client_master_report',
    { client_code: clientCode },
    'Dhanvo-NSE-MF-Client/1.0',
  );
  const clients = readNseReport(content, 'client master');
  const client = clients.find(
    (row) => getReportValue(row, ['client_code', 'ucc']).toUpperCase() === clientCode.toUpperCase(),
  );
  if (!client) {
    const error = new Error('NSE could not find your registered client details.');
    error.statusCode = 404;
    throw error;
  }

  const clientType = getReportValue(client, ['client_type', 'transaction_mode']).toUpperCase();
  const defaultDp = getReportValue(client, ['default_dp']).toUpperCase();
  const dematActive = clientType.includes('DEMAT')
    && getReportValue(client, ['dp_status']).toUpperCase() === 'ACTIVE';
  const bankAccounts = Array.from({ length: 5 }, (_, index) => {
    const bankNumber = index + 1;
    return {
      accountNo: getReportValue(client, [`account_no_${bankNumber}`, `bank${bankNumber}_account_no`]),
      ifsc: getReportValue(client, [
        `ifsc_code_${bankNumber}`,
        `ifsc_${bankNumber}`,
        `bank${bankNumber}_ifsc`,
        ...(bankNumber === 1 ? ['ifsc_code', 'ifsc', 'bank_ifsc'] : []),
      ]).toUpperCase(),
      status: getReportValue(client, [`bank${bankNumber}_status`]).toUpperCase(),
      isDefault: ['YES', 'Y'].includes(
        getReportValue(client, [`default_bank_flag_${bankNumber}`]).toUpperCase(),
      ),
    };
  });
  const activeBank = bankAccounts.find((bank) => bank.status === 'ACTIVE' && bank.isDefault)
    || bankAccounts.find((bank) => bank.status === 'ACTIVE' && bank.accountNo);

  return {
    dematActive,
    dpTransactionMode: defaultDp === 'NSDL' ? 'N' : defaultDp === 'CDSL' ? 'C' : '',
    bankAccountNo: activeBank?.accountNo || '',
    bankIfsc: activeBank?.ifsc || '',
  };
}

function getNseArn() {
  return String(process.env.NSE_SUB_BROKER_ARN || '').trim().toUpperCase();
}

function formatPlanRegistrationResult(type, response) {
  const results = Array.isArray(response.reg_data) ? response.reg_data : [];
  const result = results[0];
  if (!result) {
    throw new Error(`NSE returned no ${type.toUpperCase()} registration result.`);
  }
  const status = getReportValue(result, ['reg_status', 'registration_status', 'status']).toUpperCase();
  const remark = getReportValue(result, ['reg_remark', 'remark']);
  if (status !== 'REG_SUCCESS') {
    const error = new Error(remark || `NSE did not confirm the ${type.toUpperCase()} registration.`);
    error.statusCode = 502;
    throw error;
  }
  return {
    type,
    registrationId: getReportValue(result, PLAN_TYPES[type].registrationIdFields),
    status,
    remark,
    schemeCode: getReportValue(result, ['scheme_code', 'sch_code', 'from_scheme_code']),
    toSchemeCode: getReportValue(result, ['to_scheme_code']),
    startDate: getReportValue(result, ['start_date']),
    amount: getReportValue(result, ['installment_amount', 'installmentamount', 'installmenamount']),
    frequency: getReportValue(result, ['frequency_type']),
  };
}

function readCancellationResult(type, response) {
  const results = Array.isArray(response.can_data)
    ? response.can_data
    : Array.isArray(response.reg_data)
      ? response.reg_data
      : [];
  const result = results[0];
  if (!result) {
    throw new Error(`NSE returned no ${type.toUpperCase()} cancellation result.`);
  }
  const status = getReportValue(result, ['can_status']).toUpperCase();
  const remark = getReportValue(result, ['can_remark', 'remark']);
  if (status !== 'CAN_SUCCESS') {
    const error = new Error(remark || `NSE did not confirm the ${type.toUpperCase()} cancellation.`);
    error.statusCode = 502;
    throw error;
  }
  return {
    type,
    registrationId: getReportValue(result, PLAN_TYPES[type].registrationIdFields),
    status,
    remark,
  };
}

function getNseEuIn() {
  return String(process.env.NSE_EUIN || '').trim().toUpperCase();
}

async function callNseMfss(path, payload, userAgent) {
  requiredEnv();
  const config = getNseConfig();
  const encryptedPwd = encryptedPassword();
  const basicAuth = Buffer.from(`${config.loginUser}:${encryptedPwd}`, 'utf8').toString('base64');

  const response = await fetch(`${config.baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US',
      Referer: 'www.google.com',
      'User-Agent': userAgent,
      memberId: String(config.memberId),
      Authorization: `Basic ${basicAuth}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(20000),
  });
  const content = await response.text();

  if (!response.ok) {
    let message = 'NSE mutual fund request failed';
    try {
      const errorBody = JSON.parse(content);
      message = errorBody.message || errorBody.error || message;
    } catch {
      // NSE may return a non-JSON error body.
    }
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }

  return content;
}

async function downloadNseFile(fileType) {
  const content = await callNseMfss(
    NAV_DOWNLOAD_PATH,
    { file_type: fileType },
    'Dhanvo-NSE-Mutual-Funds/1.0',
  );

  if (content.trimStart().startsWith('{')) {
    let responseBody;
    try {
      responseBody = JSON.parse(content);
    } catch {
      throw new Error(`NSE returned invalid ${fileType} response data`);
    }

    const fileContent = responseBody.file_content
      || responseBody.fileContent
      || responseBody.data;
    if (typeof fileContent === 'string') {
      return fileContent;
    }
    throw new Error(responseBody.message || responseBody.error || `NSE returned no ${fileType} file`);
  }

  return content;
}

function parseNseJsonResponse(content, action) {
  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`NSE returned an invalid ${action} response`);
  }
}

router.get('/eligibility', protect, (req, res) => {
  return res.json({ success: true, data: { canInvest: true, reason: '' } });
});

router.post('/orders', protect, async (req, res) => {
  let transactionId = '';
  try {
    if (req.body?.confirmed !== true) {
      return res.status(400).json({
        success: false,
        message: 'Confirm that you authorize this NSE purchase order and payment before submitting.',
      });
    }

    const schemeCode = String(req.body?.schemeCode || '').trim();
    if (!/^[a-zA-Z0-9._-]{1,20}$/.test(schemeCode)) {
      return res.status(400).json({ success: false, message: 'Choose a valid mutual fund scheme.' });
    }
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount < 1 || amount > 99999999999.99 || Math.round(amount * 100) !== amount * 100) {
      return res.status(400).json({ success: false, message: 'Enter a valid investment amount with up to two decimal places.' });
    }

    const payment = validatePurchaseFields(req.body);
    if (payment.error) {
      return res.status(400).json({ success: false, message: payment.error });
    }

    const { rows } = await pool.query(
      `SELECT nse_client_code, nse_ucc_registered, nse_status, nse_status_remark,
              fatca_status, is_verified, phone, email
       FROM users WHERE id = $1 LIMIT 1`,
      [req.user._id]
    );
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }
    if (!String(user.nse_client_code || '').trim()) {
      return res.status(422).json({
        success: false,
        message: 'Complete your NSE account registration before placing an investment order.',
      });
    }
    if (String(user.nse_client_code).trim().length > 10 || !user.nse_ucc_registered) {
      return res.status(422).json({
        success: false,
        message: 'Complete NSE UCC registration before placing an investment order.',
      });
    }
    if (String(user.nse_status || '').trim().toUpperCase() !== 'ACTIVE') {
      return res.status(409).json({
        success: false,
        code: 'NSE_CLIENT_NOT_ACTIVE',
        message: 'NSE has not activated your client account yet. Complete any pending authorization or contact Dhanvo support before investing.',
        data: {
          nseStatus: String(user.nse_status || 'PENDING').trim().toUpperCase(),
          nseStatusRemark: String(user.nse_status_remark || '').trim(),
        },
      });
    }
    if (String(user.fatca_status || '').trim().toUpperCase() !== 'SUBMITTED') {
      return res.status(422).json({
        success: false,
        code: 'FATCA_NOT_SUBMITTED',
        message: 'Submit your FATCA declaration before placing an NSE purchase order.',
      });
    }
    if (!user.is_verified) {
      return res.status(422).json({
        success: false,
        code: 'PAN_NOT_VERIFIED',
        message: 'Complete PAN verification before placing an NSE purchase order.',
      });
    }
    const [schemeFile] = schemesCache && Date.now() - schemesCache.cachedAt < CACHE_TTL_MS
      ? [null]
      : [await downloadNseFile('SCH')];
    const scheme = schemesCache && Date.now() - schemesCache.cachedAt < CACHE_TTL_MS
      ? schemesCache.schemes.find((item) => item.schemeCode.toUpperCase() === schemeCode.toUpperCase())
      : parseSchemeMaster(schemeFile).find((item) => item.schemeCode.toUpperCase() === schemeCode.toUpperCase());

    if (
      !scheme
      || !scheme.purchaseEligible
      || !scheme.amcCode
      || !['R', 'REG', 'REGULAR'].includes(scheme.plan.toUpperCase())
    ) {
      return res.status(400).json({
        success: false,
        message: 'This scheme is unavailable for purchase through your registered distributor account.',
      });
    }
    const amountError = getPurchaseAmountError(amount, scheme);
    if (amountError) {
      return res.status(400).json({
        success: false,
        message: amountError,
      });
    }

    requiredEnv();
    const clientDetails = await loadNseClientMaster(String(user.nse_client_code).trim());
    if (
      !/^\d{1,50}$/.test(clientDetails.bankAccountNo)
      || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(clientDetails.bankIfsc)
    ) {
      return res.status(422).json({
        success: false,
        message: 'No valid active bank account is available on your NSE profile. Update your registered bank details with NSE and try again.',
      });
    }
    const euin = getNseEuIn();
    if (!isValidNseEuin(euin)) {
      return res.status(503).json({
        success: false,
        message: 'NSE_EUIN is missing or invalid on the server. Configure your registered EUIN in the format E followed by six digits, then restart the backend.',
      });
    }
    const arn = getNseArn();
    if (arn && (arn.length > 20 || !/^ARN-[A-Z0-9-]+$/.test(arn))) {
      return res.status(503).json({
        success: false,
        message: 'NSE order configuration contains an invalid distributor ARN. Please contact Dhanvo support.',
      });
    }
    const reference = crypto.randomUUID().replace(/-/g, '').slice(0, 25);
    const orderPayload = buildPurchaseOrderPayload({
      scheme,
      user,
      clientDetails,
      amount,
      euin,
      arn,
      reference,
    });
    const orderContent = await callNseMfss(
      '/nsemfdesk/api/v2/transaction/NORMAL',
      orderPayload,
      'Dhanvo-NSE-MF-Purchase/1.0',
    );
    const orderResponse = parseNseJsonResponse(orderContent, 'purchase order');
    const order = Array.isArray(orderResponse?.transaction_details)
      ? orderResponse.transaction_details[0]
      : null;
    transactionId = String(order?.trxn_order_id || '').trim();
    const orderStatus = String(order?.trxn_status || '').trim().toUpperCase();

    if (orderStatus !== 'TRXN SUCCESS' || !/^\d{1,12}$/.test(transactionId)) {
      const minimumAmountRejected = /amount.*less than minimum|minimum.*specified for scheme/i
        .test(String(order?.trxn_remark || ''));
      return res.status(502).json({
        success: false,
        message: order?.trxn_remark || 'NSE did not confirm the purchase order. Contact support before retrying.',
        data: {
          orderId: transactionId || '0',
          orderStatus,
          ...(minimumAmountRejected && {
            purchaseConstraints: {
              minimumAmount: scheme.minPurchaseAmount,
              maximumAmount: scheme.maxPurchaseAmount,
              amountMultiple: scheme.purchaseAmountMultiple,
            },
          }),
        },
      });
    }

    let paymentContent;
    try {
      paymentContent = await callNseMfss(
        '/nsemfdesk/api/v2/payments/purchase_payment',
        buildPurchasePaymentPayload(
          payment,
          clientDetails,
          String(user.nse_client_code).trim(),
          transactionId,
        ),
        'Dhanvo-NSE-MF-Payment/1.0',
      );
    } catch (error) {
      console.error(`NSE accepted mutual fund order ${transactionId}, but payment could not be started:`, error.message);
      return res.status(502).json({
        success: false,
        message: 'NSE accepted your purchase order, but payment could not be started. Contact support before placing another order.',
        data: { orderId: transactionId, orderStatus, paymentStatus: 'NOT_STARTED' },
      });
    }

    const paymentResponse = parseNseJsonResponse(paymentContent, 'purchase payment');
    const paymentStatus = String(paymentResponse.status || '').trim().toUpperCase();
    if (paymentStatus !== 'SUCCESS') {
      return res.status(502).json({
        success: false,
        message: paymentResponse.remark || 'NSE accepted your purchase order, but payment was not started. Contact support before retrying.',
        data: { orderId: transactionId, orderStatus, paymentStatus: paymentStatus || 'FAILED' },
      });
    }

    const paymentUrl = String(paymentResponse.short_url || '').trim();
    if (payment.paymentMode === 'UPI' && !paymentUrl) {
      return res.status(502).json({
        success: false,
        message: 'NSE accepted your purchase order but did not return a UPI payment link for the QR code. Contact support before placing another order.',
        data: { orderId: transactionId, orderStatus, paymentStatus },
      });
    }
    if (paymentUrl) {
      let parsedUrl;
      try {
        parsedUrl = new URL(paymentUrl);
      } catch {
        return res.status(502).json({
          success: false,
          message: 'NSE accepted your order and payment, but returned an invalid payment link. Contact support.',
          data: { orderId: transactionId, orderStatus, paymentStatus },
        });
      }
      if (
        parsedUrl.protocol !== 'https:'
        || !/(^|\.)nseindia\.com$/i.test(parsedUrl.hostname)
        && !/(^|\.)nseinvest\.com$/i.test(parsedUrl.hostname)
      ) {
        return res.status(502).json({
          success: false,
          message: 'NSE accepted your order but returned an untrusted payment link. Contact support.',
          data: { orderId: transactionId, orderStatus, paymentStatus },
        });
      }
    }

    return res.json({
      success: true,
      message: 'Purchase order accepted. Complete payment to finish your investment.',
      data: {
        orderId: transactionId,
        orderStatus,
        paymentStatus,
        paymentMode: payment.paymentMode,
        paymentUrl: paymentUrl || null,
        amount: Number(paymentResponse.order_amount || amount),
        paymentRemark: String(paymentResponse.remark || ''),
      },
    });
  } catch (error) {
    console.error('NSE mutual fund purchase failed:', error.message);
    if (error.message.startsWith('NSE_NOT_CONFIGURED:')) {
      return res.status(503).json({
        success: false,
        message: 'Mutual fund orders are not configured on the server. Please contact support.',
      });
    }
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        message: transactionId
          ? `NSE accepted order ${transactionId}, but the next step timed out. Contact support before retrying.`
          : 'The NSE purchase request timed out. Its status may be uncertain; contact support before retrying.',
        data: transactionId ? { orderId: transactionId, orderStatus: 'TRXN SUCCESS' } : undefined,
      });
    }
    const statusCode = [400, 422, 503].includes(error.statusCode) ? error.statusCode : 502;
    return res.status(statusCode).json({
      success: false,
      message: [400, 422, 503].includes(error.statusCode)
        ? error.message
        : 'Unable to complete the NSE purchase request. Contact support before retrying.',
      data: transactionId ? { orderId: transactionId } : undefined,
    });
  }
});

router.get('/watchlist', protect, async (req, res) => {
  try {
    const [schemeCodes, nseSchemes] = await Promise.all([
      updateMutualFundWatchlist(req.user._id),
      loadNseSchemes(),
    ]);
    const schemesByCode = new Map(
      nseSchemes.data.schemes.map((scheme) => [scheme.schemeCode.toUpperCase(), scheme]),
    );
    const schemes = schemeCodes
      .map((code) => schemesByCode.get(code.toUpperCase()))
      .filter(Boolean);
    return res.json({
      success: true,
      data: { schemes, lastUpdated: nseSchemes.data.lastUpdated },
    });
  } catch (error) {
    return sendMutualFundWatchlistError(res, error, 'Unable to load your NSE mutual-fund watchlist.');
  }
});

router.post('/watchlist', protect, async (req, res) => {
  const schemeCode = String(req.body?.schemeCode || '').trim().toUpperCase();
  if (!schemeCode || schemeCode.length > 30) {
    return res.status(400).json({ success: false, message: 'Choose a valid NSE mutual-fund scheme.' });
  }

  try {
    const nseSchemes = await loadNseSchemes();
    const scheme = nseSchemes.data.schemes.find(
      (item) => item.schemeCode.toUpperCase() === schemeCode,
    );
    if (!scheme) {
      return res.status(404).json({
        success: false,
        message: 'This scheme is no longer available in the NSE scheme list. Refresh and try again.',
      });
    }

    const schemeCodes = await updateMutualFundWatchlist(req.user._id, (currentCodes) => {
      if (currentCodes.some((code) => code.toUpperCase() === schemeCode)) {
        const error = new Error('This mutual-fund scheme is already in your watchlist.');
        error.statusCode = 409;
        throw error;
      }
      return [...currentCodes, scheme.schemeCode];
    });
    const schemesByCode = new Map(
      nseSchemes.data.schemes.map((item) => [item.schemeCode.toUpperCase(), item]),
    );
    return res.status(201).json({
      success: true,
      data: schemeCodes.map((code) => schemesByCode.get(code.toUpperCase())).filter(Boolean),
    });
  } catch (error) {
    return sendMutualFundWatchlistError(res, error, 'Unable to add this NSE scheme to your watchlist.');
  }
});

router.delete('/watchlist/:schemeCode', protect, async (req, res) => {
  const schemeCode = String(req.params.schemeCode || '').trim().toUpperCase();
  try {
    const schemeCodes = await updateMutualFundWatchlist(req.user._id, (currentCodes) => {
      if (!currentCodes.some((code) => code.toUpperCase() === schemeCode)) {
        const error = new Error('This scheme is not in your watchlist.');
        error.statusCode = 404;
        throw error;
      }
      return currentCodes.filter((code) => code.toUpperCase() !== schemeCode);
    });
    return res.json({
      success: true,
      data: { removedSchemeCode: schemeCode, schemeCodes },
    });
  } catch (error) {
    return sendMutualFundWatchlistError(res, error, 'Unable to remove this scheme from your watchlist.');
  }
});

router.get('/plans', protect, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT nse_client_code, nse_ucc_registered
       FROM users WHERE id = $1 LIMIT 1`,
      [req.user._id],
    );
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }
    if (!user.nse_ucc_registered || !String(user.nse_client_code || '').trim()) {
      return res.status(403).json({
        success: false,
        message: 'Complete NSE account registration to view your systematic plans.',
      });
    }

    const clientCode = String(user.nse_client_code).trim();
    const [sips, stps, swps] = await Promise.all([
      loadPlanReport('sip', clientCode),
      loadPlanReport('stp', clientCode),
      loadPlanReport('swp', clientCode),
    ]);
    return res.json({
      success: true,
      data: { sips, stps, swps, lastUpdated: new Date().toISOString() },
    });
  } catch (error) {
    return sendMutualFundWatchlistError(res, error, 'Unable to load your NSE systematic plans.');
  }
});

router.get('/activity', protect, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT nse_client_code, nse_ucc_registered
       FROM users WHERE id = $1 LIMIT 1`,
      [req.user._id],
    );
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }
    if (!user.nse_ucc_registered || !String(user.nse_client_code || '').trim()) {
      return res.status(403).json({
        success: false,
        message: 'Complete NSE account registration to view allotment activity.',
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const defaultFrom = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
    const requestedFromDate = req.query.fromDate === undefined ? defaultFrom : req.query.fromDate;
    const requestedToDate = req.query.toDate === undefined ? today : req.query.toDate;
    const fromDate = parsePlanDate(requestedFromDate);
    const toDate = parsePlanDate(requestedToDate);
    if (!fromDate || !toDate || fromDate > toDate || toDate > new Date(`${today}T00:00:00.000Z`)) {
      return res.status(400).json({
        success: false,
        message: 'Choose a valid activity date range ending today or earlier.',
      });
    }
    const dateRangeDays = (toDate.getTime() - fromDate.getTime()) / 86400000;
    if (dateRangeDays > 30) {
      return res.status(400).json({
        success: false,
        message: 'NSE allotment activity can be loaded for a maximum 30-day date range at a time.',
      });
    }

    const content = await callNseMfss(
      '/nsemfdesk/api/v2/reports/ALLOTMENT_STATEMENT',
      {
        order_ids: '',
        from_date: formatNseDate(fromDate.toISOString().slice(0, 10)),
        to_date: formatNseDate(toDate.toISOString().slice(0, 10)),
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
    }));
    return res.json({
      success: true,
      data: {
        activity,
        fromDate: fromDate.toISOString().slice(0, 10),
        toDate: toDate.toISOString().slice(0, 10),
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    return sendMutualFundWatchlistError(res, error, 'Unable to load NSE allotment activity.');
  }
});

router.post('/plans/:planType', protect, async (req, res) => {
  const type = String(req.params.planType || '').toLowerCase();
  const plan = PLAN_TYPES[type];
  if (!plan) {
    return res.status(404).json({ success: false, message: 'Choose SIP, STP, or SWP.' });
  }
  if (req.body?.confirmed !== true) {
    return res.status(400).json({
      success: false,
      message: `Confirm that you authorize this NSE ${type.toUpperCase()} registration.`,
    });
  }

  try {
    const { rows } = await pool.query(
      `SELECT nse_client_code, nse_ucc_registered, nse_status, fatca_status, phone, email
       FROM users WHERE id = $1 LIMIT 1`,
      [req.user._id],
    );
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }
    const startDate = parsePlanDate(req.body?.startDate);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (!startDate || startDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Choose a valid start date today or later.',
      });
    }
    const frequencyType = String(req.body?.frequencyType || '').trim().toUpperCase();
    if (!plan.frequencyTypes.includes(frequencyType)) {
      return res.status(400).json({ success: false, message: 'Choose a supported plan frequency.' });
    }
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 99999999999.99 || Math.round(amount * 100) !== amount * 100) {
      return res.status(400).json({ success: false, message: 'Enter a valid plan amount with up to two decimal places.' });
    }
    const installments = Number(req.body?.installmentCount);
    if (!Number.isInteger(installments) || installments < 1 || installments > 9999) {
      return res.status(400).json({ success: false, message: 'Enter a valid number of installments.' });
    }
    const arn = getNseArn();

    const nseData = await loadNseSchemes();
    const schemeCode = String(req.body?.schemeCode || '').trim().toUpperCase();
    const sourceSchemeCode = String(req.body?.fromSchemeCode || '').trim().toUpperCase();
    const targetSchemeCode = String(req.body?.toSchemeCode || '').trim().toUpperCase();
    const schemesByCode = new Map(
      nseData.data.schemes.map((item) => [item.schemeCode.toUpperCase(), item]),
    );
    const scheme = schemesByCode.get(schemeCode);
    const sourceScheme = schemesByCode.get(sourceSchemeCode);
    const targetScheme = schemesByCode.get(targetSchemeCode);

    if (type !== 'stp' && (!scheme || scheme.plan !== 'Regular')) {
      return res.status(400).json({
        success: false,
        message: 'Choose an active NSE regular-plan scheme.',
      });
    }
    if (type === 'sip' && (!scheme.purchaseEligible || !scheme.amcCode)) {
      return res.status(400).json({
        success: false,
        message: 'This scheme is not enabled for a new NSE SIP registration.',
      });
    }
    if (type === 'stp' && (
      !sourceScheme
      || !targetScheme
      || sourceScheme.plan !== 'Regular'
      || targetScheme.plan !== 'Regular'
      || sourceSchemeCode === targetSchemeCode
    )) {
      return res.status(400).json({
        success: false,
        message: 'Choose two different active NSE regular-plan schemes for the transfer.',
      });
    }

    const clientCode = String(user.nse_client_code).trim();
    const clientDetails = await loadNseClientMaster(clientCode);
    const transactionMode = clientDetails.dematActive ? 'D' : 'P';
    if (type !== 'sip' && transactionMode === 'P' && !/^\d{1,15}$/.test(String(req.body?.folioNumber || '').trim())) {
      return res.status(400).json({
        success: false,
        message: 'Enter the NSE folio number for this physical-folio plan.',
      });
    }
    if (type === 'swp' && !clientDetails.bankAccountNo) {
      return res.status(422).json({
        success: false,
        message: 'No active bank account is available on your NSE client profile for SWP payouts.',
      });
    }

    const euin = getNseEuIn();
    const reference = crypto.randomUUID().replace(/-/g, '').slice(0, 25);
    const commonDetails = {
      start_date: formatNseDate(req.body.startDate),
      frequency_type: frequencyType,
      first_order_today: 'N',
      euin_declaration: 'Y',
      euin_number: euin,
      sub_broker_code: '',
      remarks: 'Plan registered by investor through Dhanvo',
      mobile: String(user.phone || '').replace(/\D/g, '').slice(-10),
      email: String(user.email || '').slice(0, 50),
      member_unique_id: reference,
    };
    let registration;

    if (type === 'sip') {
      const mandateId = String(req.body?.mandateId || '').trim();
      if (mandateId && !/^\d{1,15}$/.test(mandateId)) {
        return res.status(400).json({ success: false, message: 'Enter a valid NSE mandate ID.' });
      }
      registration = {
        amc_code: scheme.amcCode,
        sch_code: scheme.schemeCode,
        client_code: clientCode,
        internal_ref_no: reference,
        trans_mode: transactionMode,
        dp_txn_mode: transactionMode === 'P' ? 'P' : clientDetails.dpTransactionMode,
        start_date: commonDetails.start_date,
        frequency_type: frequencyType,
        frequency_allowed: '1',
        installment_amount: amount.toFixed(2),
        status: '1',
        member_code: String(process.env.NSE_MEMBER_ID || process.env.NSE_MEMBER_CODE || '').trim(),
        folio_no: String(req.body?.folioNumber || '').trim(),
        sip_remarks: commonDetails.remarks,
        installment_no: String(installments),
        sip_mandate_id: mandateId,
        sub_broker_code: commonDetails.sub_broker_code,
        euin_number: euin,
        euin_declaration: commonDetails.euin_declaration,
        dpc_flag: 'Y',
        first_order_today: commonDetails.first_order_today,
        sub_broker_arn: arn,
        end_date: '',
        primary_holder_mobile: commonDetails.mobile,
        primary_holder_email: commonDetails.email,
        step_up_required: 'N',
        step_up_start_date: '',
        step_up_end_date: '',
        step_up_frequency: '',
        step_up_amount: '',
        filler_1: '',
        filler_2: '',
        filler_3: '',
        filler_4: '',
        filler_5: '',
        member_unique_id: reference,
      };
    } else if (type === 'stp') {
      registration = {
        client_code: clientCode,
        from_scheme_code: sourceScheme.schemeCode,
        to_scheme_code: targetScheme.schemeCode,
        buy_sell_type: 'ADDITIONAL',
        transaction_mode: transactionMode,
        folio_no: String(req.body?.folioNumber || '').trim(),
        internal_ref_number: reference,
        ...commonDetails,
        no_of_transfers: String(installments),
        to_date: '',
        installment_amount: amount.toFixed(2),
        installment_units: '',
        sub_broker_arn_code: arn,
      };
    } else {
      registration = {
        client_code: clientCode,
        scheme_code: scheme.schemeCode,
        trans_mode: transactionMode,
        folio_no: String(req.body?.folioNumber || '').trim(),
        internal_ref_no: reference,
        ...commonDetails,
        no_of_withdrawals: String(installments),
        end_date: '',
        installment_amount: amount.toFixed(2),
        installment_units: '',
        sub_broker_arn: arn,
        account_no: clientDetails.bankAccountNo,
      };
    }

    const content = await callNseMfss(
      plan.register,
      { reg_data: [registration] },
      `Dhanvo-NSE-MF-${type.toUpperCase()}/1.0`,
    );
    const result = formatPlanRegistrationResult(
      type,
      parseNseJsonResponse(content, `${type.toUpperCase()} registration`),
    );
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    return sendMutualFundWatchlistError(res, error, `Unable to register your NSE ${type.toUpperCase()} plan.`);
  }
});

router.post('/plans/:planType/:registrationId/cancel', protect, async (req, res) => {
  const type = String(req.params.planType || '').toLowerCase();
  const plan = PLAN_TYPES[type];
  const registrationId = String(req.params.registrationId || '').trim();
  if (!plan) {
    return res.status(404).json({ success: false, message: 'Choose SIP, STP, or SWP.' });
  }
  if (!/^\d{1,15}$/.test(registrationId)) {
    return res.status(400).json({ success: false, message: 'Enter a valid NSE registration number.' });
  }
  if (req.body?.confirmed !== true) {
    return res.status(400).json({
      success: false,
      message: `Confirm that you want to cancel this NSE ${type.toUpperCase()} plan.`,
    });
  }

  try {
    const { rows } = await pool.query(
      `SELECT nse_client_code, nse_ucc_registered
       FROM users WHERE id = $1 LIMIT 1`,
      [req.user._id],
    );
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }
    const clientCode = String(user.nse_client_code || '').trim();
    if (!user.nse_ucc_registered || !clientCode) {
      return res.status(403).json({
        success: false,
        message: 'An active NSE client registration is required to manage a plan.',
      });
    }

    const registrations = await loadPlanReport(type, clientCode);
    if (!registrations.some((item) => item.registrationId === registrationId)) {
      return res.status(404).json({
        success: false,
        message: 'That plan was not found in your NSE account. Refresh the list and try again.',
      });
    }
    const remarks = type === 'sip'
      ? '13:Requested by investor'
      : `Investor requested ${type.toUpperCase()} cancellation`;
    const content = await callNseMfss(
      plan.cancel,
      {
        can_data: [{
          client_code: clientCode,
          [plan.cancellationIdField]: registrationId,
          remarks,
        }],
      },
      `Dhanvo-NSE-MF-${type.toUpperCase()}-Cancel/1.0`,
    );
    const result = readCancellationResult(
      type,
      parseNseJsonResponse(content, `${type.toUpperCase()} cancellation`),
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    return sendMutualFundWatchlistError(res, error, `Unable to cancel your NSE ${type.toUpperCase()} plan.`);
  }
});

router.get('/schemes', async (req, res) => {
  try {
    const nseSchemes = await loadNseSchemes();
    const settings = await readMfPublicationSettings();
    return res.json({
      success: true,
      data: {
        ...nseSchemes.data,
        schemes: nseSchemes.data.schemes.filter((scheme) => isSchemePublished(scheme, settings)),
        publication: getPublicMfPublicationSettings(settings),
      },
    });
  } catch (error) {
    console.error('NSE mutual fund download or publication settings failed:', error.message);
    if (error.message.startsWith('NSE_NOT_CONFIGURED:')) {
      return res.status(503).json({
        success: false,
        message: 'NSE API is not configured on the server. Check the backend NSE credentials and member ID.',
      });
    }
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return res.status(504).json({
        success: false,
        message: 'NSE mutual fund data request timed out. Please try again.',
      });
    }
    return res.status(502).json({
      success: false,
      message: 'Unable to load mutual fund data from NSE. Please try again later.',
    });
  }
});

export { callNseMfss, formatNseDate, getReportValue, loadNseSchemes, loadPlanReport, readNseReport };
export default router;
