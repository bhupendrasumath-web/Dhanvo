import express from 'express';
import { pool } from '../config/db.js';
import User from '../models/User.js';
import { generateToken, protect } from '../middleware/auth.js';
import { encryptedPassword, getNseConfig, requiredEnv } from '../utils/nseAuth.js';

const router = express.Router();
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const TAX_STATUS_MAP = {
  Individual: '01',
  HUF: '02',
  NRI: '03',
  PIO: '04',
  Company: '05',
  Trust: '06',
  Partnership: '07',
  LLP: '08',
};
const NSE_STATE_CODES = {
  'ANDHRA PRADESH': 'AP',
  'ARUNACHAL PRADESH': 'AR',
  ASSAM: 'AS',
  BIHAR: 'BR',
  CHHATTISGARH: 'CG',
  GOA: 'GA',
  GUJARAT: 'GJ',
  HARYANA: 'HR',
  'HIMACHAL PRADESH': 'HP',
  'JAMMU AND KASHMIR': 'JK',
  JHARKHAND: 'JH',
  KARNATAKA: 'KA',
  KERALA: 'KL',
  LADAKH: 'LA',
  'MADHYA PRADESH': 'MP',
  MAHARASHTRA: 'MH',
  MANIPUR: 'MN',
  MEGHALAYA: 'ML',
  MIZORAM: 'MZ',
  NAGALAND: 'NL',
  ODISHA: 'OR',
  PUNJAB: 'PB',
  RAJASTHAN: 'RJ',
  SIKKIM: 'SK',
  'TAMIL NADU': 'TN',
  TELANGANA: 'TG',
  TRIPURA: 'TR',
  'UTTAR PRADESH': 'UP',
  'UTTARAKHAND': 'UK',
  'WEST BENGAL': 'WB',
  'ANDAMAN AND NICOBAR ISLANDS': 'AN',
  CHANDIGARH: 'CH',
  'DADRA AND NAGAR HAVELI AND DAMAN AND DIU': 'DN',
  DELHI: 'DL',
  'NATIONAL CAPITAL TERRITORY OF DELHI': 'DL',
  LAKSHADWEEP: 'LD',
  PUDUCHERRY: 'PY',
};

function generateNseClientCode(pan) {
  const normalizedPan = String(pan || '').trim().toUpperCase();
  if (!PAN_PATTERN.test(normalizedPan)) {
    throw new Error('A valid PAN is required to generate an NSE client code');
  }

  return `DHV${normalizedPan.slice(0, 7)}`;
}

async function generateUniqueNseClientCode(pan) {
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS nse_client_code VARCHAR(10)');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS nse_ucc_registered BOOLEAN DEFAULT FALSE');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS nse_ucc_registered_at TIMESTAMP');
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS login_credential_type VARCHAR(10) NOT NULL DEFAULT 'password'");
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS users_nse_client_code_unique ON users(nse_client_code) WHERE nse_client_code IS NOT NULL');

  const candidate = generateNseClientCode(pan);
  const existing = await pool.query(
    'SELECT id FROM users WHERE nse_client_code = $1 LIMIT 1',
    [candidate]
  );

  if (existing.rowCount > 0) {
    throw new Error(`NSE_CLIENT_CODE_COLLISION: PAN prefix ${candidate.slice(3)} is already assigned`);
  }

  return candidate;
}

async function ensureUserNseClientCode(user) {
  if (!user) return null;

  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS nse_client_code VARCHAR(10)');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS nse_ucc_registered BOOLEAN DEFAULT FALSE');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS nse_ucc_registered_at TIMESTAMP');
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS users_nse_client_code_unique ON users(nse_client_code) WHERE nse_client_code IS NOT NULL');

  const existingCode = String(user.nseClientCode || '').trim();
  if (existingCode) return existingCode;

  const clientCode = await generateUniqueNseClientCode(user.pan);
  await pool.query(
    'UPDATE users SET nse_client_code = $1, nse_ucc_registered = FALSE, nse_ucc_registered_at = NULL WHERE id = $2',
    [clientCode, user._id]
  );

  return clientCode;
}

function getNseTaxStatus(value) {
  return TAX_STATUS_MAP[String(value || '').trim()] || '01';
}

function splitName(fullName) {
  const value = String(fullName || '').trim();

  if (!value) {
    return { firstName: '', middleName: '', lastName: '' };
  }

  const parts = value.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return { firstName: parts[0], middleName: '', lastName: '' };
  }

  if (parts.length === 2) {
    return { firstName: parts[0], middleName: '', lastName: parts[1] };
  }

  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

async function getExistingClientCode({ email, phone, userId = null }) {
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS nse_client_code VARCHAR(10)');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS nse_ucc_registered BOOLEAN DEFAULT FALSE');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS nse_ucc_registered_at TIMESTAMP');
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS users_nse_client_code_unique ON users(nse_client_code) WHERE nse_client_code IS NOT NULL');

  const lookupEmail = String(email || '').trim().toLowerCase();
  const lookupPhone = String(phone || '').trim();

  let targetUser = null;

  if (userId) {
    targetUser = await User.findById(userId);
  } else if (lookupEmail || lookupPhone) {
    targetUser = await User.findOne({ $or: [{ email: lookupEmail }, { phone: lookupPhone }] });
  }

  if (!targetUser) return { clientCode: null, isRegistered: false };

  const existingCode = String(targetUser.nseClientCode || '').trim();
  const isRegistered = Boolean(targetUser.nseUccRegistered);

  return {
    clientCode: existingCode || null,
    isRegistered,
  };
}

function normalizeNseDate(dateValue) {
  if (!dateValue) return '';
  const raw = String(dateValue).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split('-');
    return `${day}/${month}/${year}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    return raw;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split('-');
    return `${day}/${month}/${year}`;
  }
  return raw;
}

function normalizeNseState(stateValue) {
  const value = String(stateValue || '').trim().toUpperCase().replace(/\s+/g, ' ');
  return NSE_STATE_CODES[value] || value;
}

function normalizeNseKycType(kycType) {
  const value = String(kycType || '').trim().toUpperCase();

  if (value === 'CKYC' || value === 'C') return 'C';
  if (value.includes('BIOMETRIC') || value === 'B') return 'B';
  if (value === 'KRA' || value === 'K') return 'K';
  return 'E';
}

function normalizeNseIdentificationType(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const directMap = {
    C: 'C',
    A: 'A',
    B: 'B',
    D: 'D',
    E: 'E',
    G: 'G',
    H: 'H',
    O: 'O',
    'PAN': 'C',
    'PAN CARD': 'C',
    'AADHAAR': 'G',
    'UIDAI / AADHAAR': 'G',
    'PASSPORT': 'A',
    'DRIVING LICENSE': 'E',
    'DRIVING LICENCE': 'E',
    'ELECTION ID CARD': 'B',
    'ID CARD': 'D',
    'NREGA': 'H',
    'OTHER': 'O',
  };

  const upper = raw.toUpperCase();
  if (directMap[upper]) return directMap[upper];

  const normalizedKey = raw.replace(/_/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
  if (directMap[normalizedKey]) return directMap[normalizedKey];

  if (directMap[raw]) return directMap[raw];
  return '';
}

function formatNseReportDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return formatNseReportDate();
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
}

function normalizeUccStatus(value, remediation = '') {
  const status = String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (status === 'ACTIVE') return 'ACTIVE';
  if (status === 'INACTIVE') return String(remediation || '').trim() ? 'ACTION_REQUIRED' : 'FAILED';
  if (['FAILED', 'REJECTED'].includes(status)) return 'FAILED';
  if (['ACTION_REQUIRED', 'REVIEW'].includes(status)) return 'ACTION_REQUIRED';
  if ([
    'PENDING',
    'OPEN',
    'SUBMITTED',
    'NOT_REGISTERED',
    'NOT_STARTED',
    'IN_PROCESS',
    'IN_PROGRESS',
    'UNDER_PROCESS',
  ].includes(status)) return 'PENDING';
  return null;
}

function normalizeNseIdentifier(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function getNseReportField(record, aliases) {
  if (!record || typeof record !== 'object') return '';
  const normalizedAliases = new Set(aliases.map((alias) => alias.toLowerCase().replace(/[^a-z0-9]/g, '')));
  const field = Object.keys(record).find((key) => normalizedAliases.has(key.toLowerCase().replace(/[^a-z0-9]/g, '')));
  return field ? String(record[field] || '').trim() : '';
}

function findNseClientReport(rows, clientCode, pan) {
  const expectedCode = normalizeNseIdentifier(clientCode);
  const expectedPan = normalizeNseIdentifier(pan);
  const reportCode = (row) => getNseReportField(row, ['client_code', 'clientCode', 'ucc', 'ucc_code']);
  const reportPan = (row) => getNseReportField(row, [
    'primary_holder_pan',
    'primaryHolderPan',
    'pan',
    'pan_number',
    'pan_no',
  ]);

  const matchingCode = expectedCode
    ? rows.filter((row) => normalizeNseIdentifier(reportCode(row)) === expectedCode)
    : [];
  if (expectedPan) {
    const codeAndPanMatch = matchingCode.find(
      (row) => normalizeNseIdentifier(reportPan(row)) === expectedPan
    );
    if (codeAndPanMatch) return codeAndPanMatch;
  } else if (matchingCode.length === 1) {
    return matchingCode[0];
  }

  const codeWithoutPan = matchingCode.filter((row) => !reportPan(row));
  if (matchingCode.length === 1 && codeWithoutPan.length === 1) return codeWithoutPan[0];

  const matchingPan = expectedPan
    ? rows.filter((row) => normalizeNseIdentifier(reportPan(row)) === expectedPan)
    : [];
  if (matchingPan.length === 1) return matchingPan[0];

  if (rows.length === 1) {
    const onlyRow = rows[0];
    const returnedCode = normalizeNseIdentifier(reportCode(onlyRow));
    const returnedPan = normalizeNseIdentifier(reportPan(onlyRow));
    if ((!returnedCode || returnedCode === expectedCode) && (!returnedPan || returnedPan === expectedPan)) {
      return onlyRow;
    }
  }

  return null;
}

async function ensurePanKycTable() {
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

  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS pan VARCHAR(20)');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE');
}

async function registerNseUcc(regDetails) {
  requiredEnv();
  const cfg = getNseConfig();
  const encryptedPwd = encryptedPassword();
  const basicAuth = Buffer.from(`${cfg.loginUser}:${encryptedPwd}`, 'utf8').toString('base64');

  const response = await fetch(`${cfg.baseUrl}/nsemfdesk/api/v2/registration/CLIENTCOMMON183`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Language': 'en-US',
      Referer: 'www.google.com',
      'User-Agent': 'Dhanvo-NSE-UCC/1.0',
      memberId: String(cfg.memberId),
      Authorization: `Basic ${basicAuth}`,
    },
    body: JSON.stringify({ reg_details: [regDetails] }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = body?.message || body?.error || 'NSE UCC registration failed';
    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }

  return body;
}

async function callNseRegistration(path, payload, userAgent) {
  requiredEnv();
  const cfg = getNseConfig();
  const encryptedPwd = encryptedPassword();
  const basicAuth = Buffer.from(`${cfg.loginUser}:${encryptedPwd}`, 'utf8').toString('base64');

  let response;
  try {
    response = await fetch(`${cfg.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Language': 'en-US',
        Referer: 'www.google.com',
        'User-Agent': userAgent,
        memberId: String(cfg.memberId),
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    error.nseEndpoint = path;
    throw error;
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.message || body?.error || `NSE request failed: ${path}`);
    error.statusCode = response.status;
    error.nseEndpoint = path;
    error.nseErrorCode = body?.error_code || body?.errorCode || body?.code || null;
    throw error;
  }

  return body;
}

function getRegistrationResult(body) {
  return Array.isArray(body?.reg_details) ? body.reg_details[0] || {} : {};
}

function getBankResults(body) {
  return Array.isArray(body?.bank_dtl) ? body.bank_dtl : [];
}

function isNseSuccess(value) {
  return ['SUCCESS', 'SUCCESSFUL', 'REG_SUCCESS'].includes(
    String(value || '').trim().toUpperCase()
  );
}

async function ensureAccountOpeningColumns() {
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS account_opening_status VARCHAR(30) DEFAULT \'PENDING\'');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS nse_status VARCHAR(30) DEFAULT \'PENDING\'');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS nse_status_remark TEXT');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS nse_status_checked_at TIMESTAMP');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS nse_status_details JSONB');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS nse_reg_id VARCHAR(100)');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS fatca_status VARCHAR(30) DEFAULT \'NOT_SUBMITTED\'');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS fatca_remark TEXT');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS fatca_reg_id VARCHAR(100)');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS fatca_prefill_details JSONB');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS nse_client_code VARCHAR(10)');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS nse_ucc_registered BOOLEAN DEFAULT FALSE');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS nse_ucc_registered_at TIMESTAMP');
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS users_nse_client_code_unique ON users(nse_client_code) WHERE nse_client_code IS NOT NULL');
}

function getPrimaryBank(application) {
  const banks = Array.isArray(application?.banks) ? application.banks : [];
  return banks.find((bank) => bank?.is_primary) || banks[0] || {};
}

async function ensureOnboardingUser(application) {
  await ensureAccountOpeningColumns();

  const identity = application.identity || {};
  const client = application.client || {};
  const email = String(identity.email || '').trim().toLowerCase();
  const phone = String(identity.phone || '').trim();
  const names = splitName(client.full_name);
  const user = await User.findOne({ $or: [{ email }, { phone }] });

  if (user) return user;

  const signupCredential = (await pool.query(
    `SELECT login_secret_hash, login_secret_type
     FROM signup_otps
     WHERE email = $1
       AND phone = $2
       AND verified_at IS NOT NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [email, phone]
  )).rows[0];
  if (!signupCredential) {
    const error = new Error('Verify your signup OTP and set a password or PIN before continuing');
    error.code = 'SIGNUP_CREDENTIAL_REQUIRED';
    throw error;
  }

  const result = await pool.query(
    `INSERT INTO users (first_name, last_name, email, phone, password, login_credential_type, pan, is_verified, account_opening_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, 'PENDING')
     RETURNING *`,
    [
      names.firstName || 'Applicant',
      names.lastName || 'User',
      email,
      phone,
      signupCredential.login_secret_hash,
      signupCredential.login_secret_type,
      String(client.pan || '').trim().toUpperCase(),
    ]
  );

  return User.findById(result.rows[0].id);
}

function buildNseRegistrationDetails(application, clientCode) {
  const client = application.client || {};
  const identity = application.identity || {};
  const address = application.address || {};
  const bank = getPrimaryBank(application);
  const names = splitName(client.full_name);
  const taxStatus = getNseTaxStatus(client.tax_status || 'Individual');
  const accountType = String(bank.account_type || 'Savings').trim().toUpperCase() === 'CURRENT'
    ? 'CA'
    : 'SB';

  return {
    client_code: clientCode,
    primary_holder_first_name: names.firstName,
    primary_holder_middle_name: names.middleName,
    primary_holder_last_name: names.lastName,
    tax_status: taxStatus,
    gender: String(client.gender || 'M').trim().toUpperCase().slice(0, 1),
    primary_holder_dob_incorporation: normalizeNseDate(client.date_of_birth || ''),
    occupation_code: String(client.occupation_code || '01').trim(),
    holding_nature: String(client.holding_type || 'SI').trim().toUpperCase() === 'JO' ? 'JO' : 'SI',
    primary_holder_pan_exempt: 'N',
    primary_holder_pan: String(client.pan || '').trim().toUpperCase(),
    primary_holder_kyc_type: normalizeNseKycType(client.kyc_type),
    client_type: 'P',
    pms: 'N',
    communication_mode: 'E',
    paperless_flag: 'P',
    mobile_declaration_flag: 'SE',
    email_declaration_flag: 'SE',
    account_type_1: accountType,
    account_no_1: String(bank.account_number || '').trim(),
    ifsc_code_1: String(bank.ifsc || '').trim().toUpperCase(),
    default_bank_flag_1: 'Y',
    div_pay_mode: '02',
    address_1: String(address.address_1 || '').trim(),
    address_2: String(address.address_2 || '').trim(),
    address_3: String(address.address_3 || '').trim(),
    city: String(address.city || '').trim(),
    state: normalizeNseState(address.state),
    pincode: String(address.pincode || '').trim(),
    country: String(address.country || 'INDIA').trim().toUpperCase(),
    email: String(identity.email || '').trim().toLowerCase(),
    indian_mobile_no: String(identity.phone || '').trim(),
  };
}

async function registerNseBank(application, clientCode) {
  const bank = getPrimaryBank(application);
  const response = await callNseRegistration(
    '/nsemfdesk/api/v2/registration/CLIENTBANKDTL',
    {
      bank_dtl: [{
        client_code: clientCode,
        action_type: 'ADD',
        account_type: String(bank.account_type || 'Savings').toUpperCase() === 'CURRENT' ? 'CA' : 'SB',
        account_no: String(bank.account_number || '').trim(),
        micr_no: '',
        ifsc_code: String(bank.ifsc || '').trim().toUpperCase(),
        default_bank_flag: 'Y',
      }],
    },
    'Dhanvo-NSE-Bank/1.0'
  );

  const results = getBankResults(response);
  if (!results.length || !results.every((item) => isNseSuccess(item?.status))) {
    throw new Error(results[0]?.error_remark || 'NSE bank registration failed');
  }

  return response;
}

async function uploadNseElog(application, clientCode, requestIp) {
  const client = application.client || {};
  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
  const date = `${String(now.getUTCDate()).padStart(2, '0')}-${month}-${String(now.getUTCFullYear()).slice(-2)} ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}`;

  const response = await callNseRegistration(
    '/nsemfdesk/api/v2/registration/eLOG',
    {
      client_code: clientCode,
      primary_holder_pan: String(client.pan || '').trim().toUpperCase(),
      primary_holder_ip_address: requestIp || '0.0.0.0',
      primary_holder_log_date: date,
    },
    'Dhanvo-NSE-eLOG/1.0'
  );

  if (String(response?.elog_status || '').trim() !== '100') {
    throw new Error(response?.elog_status_message || 'NSE eLOG upload failed');
  }

  return response;
}

function normalizeResponse(response, requestedPan) {
  const row =
    Array.isArray(response?.report_data)
      ? response.report_data[0] || {}
      : {};

  const pan = String(
    row.client_pan ||
    response?.pan ||
    requestedPan ||
    ''
  ).trim().toUpperCase();

  const name = String(
    row.holder_name ||
    response?.name ||
    ''
  ).trim();

  const dob = String(
    row.holder_dob ||
    response?.dob ||
    ''
  ).trim();

  const status = String(
    row.kyc_status ||
    response?.kyc_status ||
    ''
  ).trim().toUpperCase();

  const remark = String(
    row.status_remark ||
    response?.kyc_status_remark ||
    ''
  ).trim();

  const serviceUnreachable = /SERVICE\s+NOT\s+REACHABLE/i.test(remark);
  const verified = status === 'S' && /^KYC\s+(REGISTERED|VALIDATED)\b/i.test(remark);

  let kycStatus = 'Not Verified';

  if (verified) {
    kycStatus = 'Verified';
  } else if (/UNDER_PROCESS/i.test(remark)) {
    kycStatus = 'Under Process';
  } else if (/REJECTED/i.test(remark)) {
    kycStatus = 'Rejected';
  } else if (/NOT AVAILABLE/i.test(remark)) {
    kycStatus = 'Not Available';
  } else if (remark) {
    kycStatus = remark;
  }

  return {
    verified,
    pan,
    name,
    dob,
    kycStatus: serviceUnreachable ? 'Service Unreachable' : kycStatus,
    statusRemark: serviceUnreachable ? 'SERVICE NOT REACHABLE' : (remark || 'NSE KYC verification failed'),
    kraName: String(row.kra_name || '').trim(),
    raw: response,
  };
}

function extractNseEkycLink(payload = {}) {
  const candidates = [
    payload?.link,
    payload?.data?.link,
    payload?.result?.link,
    payload?.response?.link,
    payload?.verification_url,
    payload?.verificationUrl,
    payload?.ekyc_url,
    payload?.ekycUrl,
    payload?.ekyc_link,
    payload?.ekycLink,
    payload?.redirect_url,
    payload?.redirectUrl,
    payload?.url,
    payload?.data?.verification_url,
    payload?.data?.verificationUrl,
    payload?.data?.ekyc_url,
    payload?.data?.ekycUrl,
    payload?.data?.ekyc_link,
    payload?.data?.ekycLink,
    payload?.data?.url,
    payload?.result?.verification_url,
    payload?.result?.verificationUrl,
    payload?.result?.ekyc_url,
    payload?.result?.ekycUrl,
    payload?.result?.url,
    payload?.response?.verification_url,
    payload?.response?.verificationUrl,
    payload?.response?.url,
  ];

  const value = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim());
  return value ? String(value).trim() : '';
}

function normalizeNseFinalKycStatus(payload, requestedPan) {
  const report =
    Array.isArray(payload?.report_data)
      ? payload.report_data[0] || {}
      : payload?.result || payload?.data || payload || {};

  const status = String(
    report?.kyc_status ||
    payload?.kyc_status ||
    report?.status ||
    payload?.status ||
    ''
  ).trim().toUpperCase();

  const remark = String(
    report?.status_remark ||
    payload?.status_remark ||
    payload?.remark ||
    report?.remark ||
    ''
  ).trim();

  const verified = status === 'S' && /^KYC\s+(?:REGISTERED|VALIDATED)\b/i.test(remark);
  let kycStatus = 'Not Verified';

  if (verified) {
    kycStatus = 'Verified';
  } else if (/UNDER_PROCESS|PENDING|PROCESSING/i.test(remark || status)) {
    kycStatus = 'Under Process';
  } else if (/REJECTED|FAIL/i.test(remark || status)) {
    kycStatus = 'Rejected';
  } else if (/NOT AVAILABLE/i.test(remark || status)) {
    kycStatus = 'Not Available';
  } else if (remark) {
    kycStatus = remark;
  } else if (status) {
    kycStatus = status;
  }

  return {
    verified,
    pan: String(report?.client_pan || report?.pan || payload?.pan || requestedPan || '').trim().toUpperCase(),
    clientCode: String(report?.client_code || payload?.client_code || payload?.clientCode || '').trim(),
    kycStatus,
    statusRemark: remark || 'KYC status not available',
    raw: payload,
  };
}

async function checkNseKycStatus(pan, clientCode = '') {
  const response = await callNseRegistration(
    '/nsemfdesk/api/v2/reports/CLIENT_KYC_REPORT',
    {
      pan,
      pan_no: pan,
      client_code: clientCode,
      clientCode,
    },
    'Dhanvo-NSE-KYC-Report/1.0'
  );
  return normalizeNseFinalKycStatus(response, pan);
}

router.post('/init-ekyc', async (req, res) => {
  try {
    const pan = String(req.body?.pan || '').trim().toUpperCase();
    const mobile = String(req.body?.mobile || req.body?.phone || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!PAN_PATTERN.test(pan)) {
      return res.status(400).json({ success: false, message: 'Valid PAN is required to start Aadhaar eKYC' });
    }

    if (!mobile) {
      return res.status(400).json({ success: false, message: 'Mobile number is required to start Aadhaar eKYC' });
    }

    if (!email) {
      return res.status(400).json({ success: false, message: 'Investor email is required to start Aadhaar eKYC' });
    }

    const existingKyc = await checkNseKycStatus(pan);
    if (existingKyc.verified) {
      return res.json({
        success: true,
        message: 'Existing KYC is verified; fresh eKYC is not required',
        data: {
          pan,
          verified: true,
          alreadyVerified: true,
          kycStatus: existingKyc.kycStatus,
          statusRemark: existingKyc.statusRemark,
          clientCode: existingKyc.clientCode,
        },
      });
    }

    const amcCode = String(process.env.NSE_EKYC_AMC_CODE || '').trim().toUpperCase();
    if (!amcCode) {
      throw new Error('NSE_NOT_CONFIGURED: Missing NSE_EKYC_AMC_CODE');
    }

    const response = await callNseRegistration(
      '/nsemfdesk/api/v1/EKYC/EKYCREG',
      {
        amcCode,
        panNo: pan,
        mobileNo: mobile,
        invEmail: email,
      },
      'Dhanvo-NSE-eKYC/1.0'
    );
    const verificationUrl = extractNseEkycLink(response);
    if (!verificationUrl) {
      const error = new Error(response?.message || 'NSE eKYC response did not include the required link');
      error.nseEndpoint = '/nsemfdesk/api/v1/EKYC/EKYCREG';
      error.nseErrorCode = response?.error_code || response?.errorCode || response?.code || null;
      throw error;
    }

    return res.json({
      success: true,
      message: 'Aadhaar eKYC registration started successfully',
      data: {
        pan,
        mobile,
        email,
        amcCode,
        verificationUrl,
        status: response?.status || 'INITIATED',
        raw: response,
      },
    });
  } catch (error) {
    console.error('Aadhaar eKYC initialization error:', {
      message: error.message,
      upstreamStatus: error.statusCode || null,
      endpoint: error.nseEndpoint || '/nsemfdesk/api/v1/EKYC/EKYCREG',
      upstreamErrorCode: error.nseErrorCode || null,
    });
    const notConfigured = String(error.message || '').startsWith('NSE_NOT_CONFIGURED');
    const status = error.statusCode === 401 || error.statusCode === 403 ? error.statusCode : notConfigured ? 503 : 502;
    return res.status(status).json({
      success: false,
      message: status === 503 ? String(error.message).replace(/^NSE_NOT_CONFIGURED:\s*/, 'NSE eKYC setup missing: ') : (error.message || 'Unable to start Aadhaar eKYC'),
      diagnostic: {
        endpoint: error.nseEndpoint || '/nsemfdesk/api/v1/EKYC/EKYCREG',
        upstreamStatus: error.statusCode || null,
        upstreamErrorCode: error.nseErrorCode || null,
      },
    });
  }
});

router.post('/check-kyc-status', async (req, res) => {
  try {
    const pan = String(req.body?.pan || '').trim().toUpperCase();
    const clientCode = String(req.body?.clientCode || req.body?.client_code || '').trim();

    if (!pan && !clientCode) {
      return res.status(400).json({ success: false, message: 'PAN or client code is required to check KYC status' });
    }

    const body = {
      pan,
      pan_no: pan,
      client_code: clientCode,
      clientCode,
    };

    const normalized = await checkNseKycStatus(pan, clientCode);

    return res.json({
      success: true,
      data: normalized,
    });
  } catch (error) {
    console.error('KYC status report error:', error.message);
    const status = error.statusCode === 401 || error.statusCode === 403 ? error.statusCode : error.message === 'NSE_NOT_CONFIGURED' ? 503 : 502;
    return res.status(status).json({
      success: false,
      message: status === 503 ? 'NSE KYC status service is not configured' : (error.message || 'Unable to check KYC status'),
    });
  }
});

router.post('/verify-pan', async (req, res) => {
  const pan = String(req.body.pan || '').trim().toUpperCase();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || '').trim();

  if (!PAN_PATTERN.test(pan)) {
    return res.status(400).json({ success: false, message: 'Valid PAN is required' });
  }

  try {
    await ensurePanKycTable();
    requiredEnv();
    const cfg = getNseConfig();
    const encryptedPwd = encryptedPassword();
    const basicAuth = Buffer.from(`${cfg.loginUser}:${encryptedPwd}`, 'utf8').toString('base64');

    const response = await fetch(`${cfg.baseUrl}/nsemfdesk/api/v2/utility/KYC_CHECK`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Language': 'en-US',
        Referer: 'www.google.com',
        'User-Agent': 'Dhanvo-NSE-KYC/1.0',
        memberId: String(cfg.memberId),
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify({ pan_no: pan }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const status = response.status === 401 || response.status === 403 ? response.status : 502;
      const message = body?.message || body?.error || 'NSE PAN verification failed';
      return res.status(status).json({
        success: false,
        message,
      });
    }

    const result = normalizeResponse(body, pan);
    const serviceUnreachable = /SERVICE\s+NOT\s+REACHABLE/i.test(String(result.statusRemark || ''));

    await pool.query(
      `INSERT INTO pan_kyc_checks (pan,email,phone,verified,name,kyc_status,status_remark,kra_name,response_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        result.pan || pan,
        email || null,
        phone || null,
        result.verified,
        result.name || null,
        result.kycStatus,
        result.statusRemark,
        result.kraName || null,
        body,
      ]
    );

    if (email || phone) {
      await pool.query(
        `UPDATE users
         SET pan = COALESCE($1, pan),
             is_verified = CASE WHEN $2 THEN TRUE ELSE is_verified END
         WHERE (email = $3 AND $3 <> '') OR (phone = $4 AND $4 <> '')`,
        [result.pan || pan, result.verified, email, phone]
      );
    }

    if (serviceUnreachable) {
      return res.status(503).json({
        success: false,
        message: 'NSE KYC service is temporarily unavailable',
        data: {
          verified: false,
          pan: result.pan,
          name: result.name,
          dob: result.dob,
          kycStatus: result.kycStatus,
          statusRemark: result.statusRemark,
          kraName: result.kraName,
        },
      });
    }

    return res.json({
      success: true,
      data: {
        verified: result.verified,
        pan: result.pan,
        name: result.name,
        dob: result.dob,
        kycStatus: result.kycStatus,
        statusRemark: result.statusRemark,
        kraName: result.kraName,
      },
    });
  } catch (error) {
    console.error('PAN verification error:', error.message);
    const status = error.message === 'NSE_NOT_CONFIGURED' ? 503 : 502;
    return res.status(status).json({
      success: false,
      message: status === 503 ? 'NSE KYC service is not configured' : 'Unable to reach NSE KYC service',
    });
  }
});

router.post('/register-nse-ucc', async (req, res) => {
  try {
    const payload = req.body || {};
    const email = String(payload.email || '').trim().toLowerCase();
    const phone = String(payload.phone || '').trim();
    const userId = payload.userId || payload.id || null;

    const candidate = await User.findOne({ $or: [{ email }, { phone }] });
    const user = candidate || (userId ? await User.findById(userId) : null);

    if (!user) {
      return res.status(200).json({
        success: true,
        skipped: true,
        message: 'User not found during signup; NSE UCC registration deferred until user exists',
        data: {
          client_code: null,
          alreadyRegistered: false,
          skipped: true,
        },
      });
    }

    const existing = await getExistingClientCode({
      email: user.email,
      phone: user.phone,
      userId: user._id,
    });

    if (existing.isRegistered && existing.clientCode) {
      return res.json({
        success: true,
        message: 'NSE UCC already registered for this user',
        data: {
          client_code: existing.clientCode,
          alreadyRegistered: true,
        },
      });
    }

    const pan = String(payload.pan || user.pan || '').trim().toUpperCase();
    if (!PAN_PATTERN.test(pan)) {
      return res.status(400).json({ success: false, message: 'A valid PAN is required for NSE KYC verification' });
    }

    const nseKyc = await checkNseKycStatus(pan);
    if (!nseKyc.verified) {
      return res.status(409).json({
        success: false,
        code: 'KYC_NOT_VERIFIED',
        message: 'NSE has not confirmed successful KYC for this PAN. UCC registration was not submitted.',
        data: {
          kycStatus: nseKyc.kycStatus,
          statusRemark: nseKyc.statusRemark,
        },
      });
    }

    const clientCode = existing.clientCode || (await ensureUserNseClientCode(user));
    const { firstName, middleName, lastName } = splitName(
      String(payload.firstName || payload.fullName || '').trim() ||
      `${String(user.firstName || '').trim()} ${String(user.lastName || '').trim()}`.trim()
    );

    const regDetails = {
      client_code: clientCode,
      primary_holder_first_name: String(payload.firstName || firstName || user.firstName || '').trim(),
      primary_holder_middle_name: String(payload.middleName || middleName || '').trim(),
      primary_holder_last_name: String(payload.lastName || lastName || user.lastName || '').trim(),
      tax_status: getNseTaxStatus(payload.taxStatus || payload.tax_status || 'Individual'),
      gender: String(payload.gender || 'M').trim().toUpperCase(),
      primary_holder_dob: normalizeNseDate(payload.dob || payload.dateOfBirth || ''),
      occupation_code: String(payload.occupationCode || '01').trim(),
      holding_nature: String(payload.holdingNature || 'SI').trim().toUpperCase(),
      primary_holder_pan: pan,
      primary_holder_mobile: String(payload.mobile || phone || user.phone || '').trim(),
      primary_holder_email: String(payload.email || user.email || '').trim().toLowerCase(),
      address_1: String(payload.address1 || payload.address_1 || '').trim(),
      address_2: String(payload.address2 || payload.address_2 || '').trim(),
      address_3: String(payload.address3 || payload.address_3 || '').trim(),
      city: String(payload.city || '').trim(),
      state: String(payload.state || '').trim(),
      pincode: String(payload.pincode || '').trim(),
      country: String(payload.country || 'INDIA').trim().toUpperCase(),
    };

    const registrationResponse = await registerNseUcc(regDetails);

    await pool.query(
      'UPDATE users SET nse_client_code = $1, nse_ucc_registered = TRUE, nse_ucc_registered_at = NOW() WHERE id = $2',
      [clientCode, user._id]
    );

    return res.json({
      success: true,
      message: 'NSE UCC registration successful',
      data: {
        client_code: clientCode,
        alreadyRegistered: false,
        registration: registrationResponse,
      },
    });
  } catch (error) {
    console.error('UCC registration error:', error.message);
    const status = error.statusCode === 401 || error.statusCode === 403 ? error.statusCode : error.message === 'NSE_NOT_CONFIGURED' ? 503 : 502;
    return res.status(status).json({
      success: false,
      message: status === 503 ? 'NSE UCC service is not configured' : error.message || 'Unable to register NSE UCC',
    });
  }
});

router.post('/complete-account-opening', async (req, res) => {
  const application = req.body?.application || {};
  const identity = application.identity || {};
  const client = application.client || {};
  const primaryBank = getPrimaryBank(application);
  const email = String(identity.email || '').trim().toLowerCase();
  const phone = String(identity.phone || '').trim();

  if (!email || !phone || !client.pan || !client.full_name) {
    return res.status(400).json({ success: false, message: 'Required account opening details are missing' });
  }

  const pan = String(client.pan).trim().toUpperCase();
  if (!PAN_PATTERN.test(pan)) {
    return res.status(400).json({ success: false, message: 'A valid PAN is required for NSE KYC verification' });
  }

  if (identity.otp_verified !== true || application.kyc_verified !== true) {
    return res.status(400).json({ success: false, message: 'OTP and KYC verification are required before account opening' });
  }

  if (!primaryBank.account_number || !primaryBank.ifsc) {
    return res.status(400).json({ success: false, message: 'Primary bank details are required' });
  }

  const nominees = Array.isArray(application.nominees) ? application.nominees : [];
  if (nominees.length && application.nomination_authentication !== 'OTP') {
    return res.status(400).json({ success: false, message: 'OTP authentication is required for nominee registration' });
  }
  if (nominees.length) {
    const nomineeEmails = nominees.map((nominee) => String(nominee?.email || '').trim().toLowerCase());
    if (nomineeEmails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return res.status(400).json({ success: false, message: 'A valid email is required for every nominee using OTP authentication' });
    }

    try {
      const verifiedEmails = await pool.query(
        `SELECT DISTINCT LOWER(email) AS email
         FROM signup_otps
         WHERE LOWER(email) = ANY($1::text[])
           AND verified_at >= NOW() - INTERVAL '30 minutes'`,
        [nomineeEmails]
      );
      const verifiedEmailSet = new Set(verifiedEmails.rows.map((row) => row.email));
      if (nomineeEmails.some((email) => !verifiedEmailSet.has(email))) {
        return res.status(400).json({ success: false, message: 'Verify a fresh email OTP for every nominee before account opening' });
      }
    } catch (error) {
      console.error('Nominee OTP verification lookup error:', error.message);
      return res.status(503).json({ success: false, message: 'Unable to confirm nominee email verification' });
    }
  }

  try {
    const nseKyc = await checkNseKycStatus(pan);
    if (!nseKyc.verified) {
      return res.status(409).json({
        success: false,
        code: 'KYC_NOT_VERIFIED',
        message: 'NSE has not confirmed successful KYC for this PAN. Complete Aadhaar eKYC and wait for NSE confirmation before continuing.',
        data: {
          kycStatus: nseKyc.kycStatus,
          statusRemark: nseKyc.statusRemark,
        },
      });
    }
  } catch (error) {
    console.error('NSE KYC verification before account opening failed:', error.message);
    const status = error.statusCode === 401 || error.statusCode === 403
      ? error.statusCode
      : error.message === 'NSE_NOT_CONFIGURED' ? 503 : 502;
    return res.status(status).json({
      success: false,
      message: status === 503
        ? 'NSE KYC status service is not configured'
        : 'Unable to confirm KYC with NSE. Account opening was not submitted.',
    });
  }

  let user;
  let clientCode;

  try {
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        code: 'ACCOUNT_EXISTS',
        message: 'An account with this email or mobile already exists. Please sign in instead.',
      });
    }

    user = await ensureOnboardingUser(application);
    clientCode = await ensureUserNseClientCode(user);

    const client = application.client || {};
    await pool.query(
      'UPDATE users SET fatca_prefill_details = $1::jsonb WHERE id = $2',
      [JSON.stringify({
        dateOfBirth: String(client.date_of_birth || '').trim(),
        occupation: String(client.occupation || '').trim(),
      }), user._id]
    );

    const registrationResponse = await registerNseUcc(
      buildNseRegistrationDetails(application, clientCode)
    );
    const registration = getRegistrationResult(registrationResponse);

    if (String(registration.reg_status || '').trim().toUpperCase() !== 'REG_SUCCESS') {
      await pool.query('UPDATE users SET account_opening_status = \'REG_FAILED\' WHERE id = $1', [user._id]);
      return res.status(502).json({
        success: false,
        message: registration.reg_remark || 'NSE UCC registration failed',
        data: { reg_status: registration.reg_status || 'REG_FAILED' },
      });
    }

    await pool.query(
      `UPDATE users
       SET nse_client_code = $1,
           nse_ucc_registered = TRUE,
           nse_ucc_registered_at = NOW(),
           account_opening_status = 'PENDING',
           nse_status = 'PENDING',
           nse_status_remark = $3,
           nse_status_checked_at = NOW(),
           nse_reg_id = $4
       WHERE id = $2`,
        [clientCode, user._id, registration.reg_remark || 'Awaiting NSE validation', registration.reg_id || null]
    );

    const fatcaPayload = application.fatca || {};
    if (Object.keys(fatcaPayload).some((key) => String(fatcaPayload[key] ?? '').trim() !== '')) {
      try {
        await submitFatcaForUser(user._id, {
          ...fatcaPayload,
          pan: String(client.pan || '').trim().toUpperCase(),
          clientCode,
        });
      } catch (fatcaError) {
        await pool.query(
          `UPDATE users SET fatca_status = 'FAILED', fatca_remark = $1 WHERE id = $2`,
          [fatcaError.message || 'FATCA submission failed during account registration', user._id]
        ).catch(() => {});
      }
    }

    const bankRegisteredSeparately = application.protocol?.bank_in_183 === false;
    if (bankRegisteredSeparately) {
      try {
        await registerNseBank(application, clientCode);
      } catch (error) {
        await pool.query('UPDATE users SET account_opening_status = \'BANK_FAILED\' WHERE id = $1', [user._id]);
        throw error;
      }
    }

    try {
      await uploadNseElog(application, clientCode, req.ip);
    } catch (error) {
      await pool.query('UPDATE users SET account_opening_status = \'ELOG_FAILED\' WHERE id = $1', [user._id]);
      throw error;
    }

    await pool.query(
      `UPDATE users
         SET account_opening_status = 'PENDING', is_verified = TRUE,
           nse_status = 'PENDING',
           nse_status_remark = 'UCC registered; awaiting NSE/Depository validation',
           nse_status_checked_at = NOW()
       WHERE id = $1`,
      [user._id]
    );

    const token = generateToken(user._id);

    return res.json({
      success: true,
      message: 'Account opening completed successfully',
      data: {
        applicationId: registration.reg_id || clientCode,
        client_code: clientCode,
        reg_id: registration.reg_id || null,
        bank_registered_separately: bankRegisteredSeparately,
        account_opening_status: 'PENDING',
        nse_status: 'PENDING',
        nse_status_remark: 'UCC registered; awaiting NSE/Depository validation',
        token,
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          nseClientCode: clientCode,
          nseUccRegistered: true,
          accountOpeningStatus: 'PENDING',
          nseStatus: 'PENDING',
          isVerified: true,
        },
      },
    });
  } catch (error) {
    console.error('Account opening completion error:', error.message);
    const status = error.code === 'SIGNUP_CREDENTIAL_REQUIRED'
      ? 400
      : error.statusCode === 401 || error.statusCode === 403
      ? error.statusCode
      : error.message === 'NSE_NOT_CONFIGURED' ? 503 : 502;

    if (user?._id && !['COMPLETED', 'BANK_FAILED', 'ELOG_FAILED', 'REG_FAILED'].includes(user.accountOpeningStatus)) {
      await pool.query('UPDATE users SET account_opening_status = \'FAILED\' WHERE id = $1', [user._id]).catch(() => {});
    }

    return res.status(status).json({
      success: false,
      message: error.message || 'Unable to complete account opening',
    });
  }
});

async function submitFatcaForUser(userId, input = {}) {
  const raw = input || {};
  const fields = {
    dateOfBirth: normalizeNseDate(raw.dateOfBirth || raw.dob || ''),
    placeOfBirth: String(raw.placeOfBirth || '').trim(),
    countryOfBirth: String(raw.countryOfBirth || '').trim().toUpperCase(),
    taxResidenceCountry: String(raw.taxResidenceCountry || '').trim().toUpperCase(),
    tin: String(raw.tin || raw.pan || '').trim().toUpperCase(),
    idType: normalizeNseIdentificationType(raw.idType || ''),
    sourceOfWealth: String(raw.sourceOfWealth || '').trim().toUpperCase(),
    incomeSlab: String(raw.incomeSlab || '').trim().toUpperCase(),
    pepFlag: String(raw.pepFlag || '').trim().toUpperCase(),
    occupationCode: String(raw.occupationCode || '').trim().toUpperCase(),
    occupationType: String(raw.occupationType || '').trim().toUpperCase(),
    addressType: String(raw.addressType || '').trim(),
  };

  const missing = Object.entries(fields)
    .filter(([key, value]) => key !== 'dateOfBirth' && !value)
    .map(([key]) => key);
  if (missing.length) {
    throw new Error(`Complete required FATCA details: ${missing.join(', ')}`);
  }
  if (fields.dateOfBirth && !/^\d{2}\/\d{2}\/\d{4}$/.test(fields.dateOfBirth)) {
    throw new Error('Date of birth must be DD/MM/YYYY');
  }
  if (!['1', '2', '3', '4', '5'].includes(fields.addressType)) {
    throw new Error('Choose a valid address type');
  }
  if (!['01', '02', '03', '04', '05', '06', '07', '08'].includes(fields.sourceOfWealth)) {
    throw new Error('Choose a valid source of wealth');
  }
  if (!['31', '32', '33', '34', '35', '36'].includes(fields.incomeSlab)) {
    throw new Error('Choose a valid annual income slab');
  }
  if (!['A', 'B', 'C', 'D', 'E', 'G', 'H', 'O'].includes(fields.idType)) {
    throw new Error('Choose a valid identity document type');
  }
  if (!['Y', 'N', 'R'].includes(fields.pepFlag)) {
    throw new Error('Choose a valid PEP status');
  }
  if (!['01', '02', '03', '04', '05', '06', '07', '08', '09', '41', '42', '43', '44', '99'].includes(fields.occupationCode)) {
    throw new Error('Choose a valid occupation code');
  }
  if (!['S', 'B', 'O', 'X'].includes(fields.occupationType)) {
    throw new Error('Choose a valid occupation category');
  }

  await ensureAccountOpeningColumns();
  const { rows } = await pool.query(
    `SELECT pan, first_name, last_name, nse_client_code, nse_ucc_registered
     FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  const user = rows[0];
  const pan = String(raw.pan || user?.pan || '').trim().toUpperCase();
  const clientCode = String(raw.clientCode || user?.nse_client_code || '').trim();
  const investorName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim().toUpperCase();

  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan) || !investorName) {
    throw new Error('A valid registered PAN and investor name are required');
  }
  if (!clientCode || !user.nse_ucc_registered) {
    throw new Error('NSE UCC must be registered before FATCA submission');
  }

  const fatcaRecord = {
    pan_rp: pan,
    inv_name: investorName,
    dob: fields.dateOfBirth,
    tax_status: '01',
    data_src: 'E',
    addr_type: fields.addressType,
    po_bir_inc: fields.placeOfBirth,
    co_bir_inc: fields.countryOfBirth,
    tax_res1: fields.taxResidenceCountry,
    tpin1: fields.tin,
    id1_type: fields.idType,
    srce_wealt: fields.sourceOfWealth,
    inc_slab: fields.incomeSlab,
    pep_flag: fields.pepFlag,
    occ_code: fields.occupationCode,
    occ_type: fields.occupationType,
    exch_name: 'O',
    ubo_appl: 'N',
    ubo_df: 'N',
    log_name: `DV_${clientCode}_${Date.now()}`,
  };

  const response = await callNseRegistration(
    '/nsemfdesk/api/v2/registration/FATCA',
    { reg_details: [fatcaRecord] },
    'Dhanvo-NSE-FATCA/1.0'
  );
  const result = getRegistrationResult(response);
  const regStatus = String(result.reg_status || '').trim().toUpperCase();
  const remark = String(result.reg_remark || '').trim();

  if (regStatus !== 'REG_SUCCESS') {
    await pool.query(
      `UPDATE users SET fatca_status = 'FAILED', fatca_remark = $1 WHERE id = $2`,
      [remark || 'NSE FATCA registration failed', userId]
    );
    throw new Error(remark || 'NSE FATCA registration failed');
  }

  await pool.query(
    `UPDATE users SET fatca_status = 'SUBMITTED', fatca_remark = $1, fatca_reg_id = $2 WHERE id = $3`,
    [remark || 'Submitted to NSE; awaiting validation', result.reg_id || null, userId]
  );

  return {
    fatcaStatus: 'SUBMITTED',
    fatcaRemark: remark || null,
    regStatus,
  };
}

router.post('/submit-fatca', protect, async (req, res) => {
  try {
    const result = await submitFatcaForUser(req.user._id, req.body || {});
    return res.json({
      success: true,
      message: 'FATCA submitted to NSE; account activation is still pending validation',
      data: result,
    });
  } catch (error) {
    console.error('FATCA submission error:', error.message);
    const status = error.statusCode === 401 || error.statusCode === 403
      ? error.statusCode
      : error.message === 'NSE_NOT_CONFIGURED' ? 503 : 502;
    return res.status(status).json({ success: false, message: error.message || 'Unable to submit FATCA to NSE' });
  }
});

router.post('/client-authorization-link', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT nse_client_code, nse_ucc_registered
       FROM users WHERE id = $1 LIMIT 1`,
      [req.user._id]
    );
    const user = result.rows[0];
    const clientCode = String(user?.nse_client_code || '').trim();

    if (!user || !clientCode || !user.nse_ucc_registered) {
      return res.status(409).json({
        success: false,
        message: 'Your NSE UCC is not registered yet, so an authorization link is not available.',
      });
    }

    const linkResponse = await callNseRegistration(
      '/nsemfdesk/api/v2/reports/GET_LINK',
      { productType: 'CL_ACT', productRefId: clientCode },
      'Dhanvo-NSE-Client-Authorization/1.0'
    );
    const errorMessage = String(linkResponse.errorMessage || linkResponse.error_remark || '').trim();
    if (String(linkResponse.response_status || '').trim().toUpperCase() === 'F' || errorMessage) {
      return res.status(502).json({
        success: false,
        message: errorMessage || 'NSE could not generate the client authorization link. Please contact support.',
      });
    }

    const authorizationUrl = String(linkResponse.firstHolderLink || '').trim();
    if (!authorizationUrl) {
      return res.status(404).json({
        success: false,
        message: 'NSE did not return an authorization link. Check your registered email or contact Dhanvo support.',
      });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(authorizationUrl);
    } catch {
      return res.status(502).json({
        success: false,
        message: 'NSE returned an invalid authorization link. Please contact support.',
      });
    }
    if (
      parsedUrl.protocol !== 'https:'
      || !/(^|\.)nseindia\.com$/i.test(parsedUrl.hostname)
      && !/(^|\.)nseinvest\.com$/i.test(parsedUrl.hostname)
    ) {
      return res.status(502).json({
        success: false,
        message: 'NSE returned an untrusted authorization link. Please contact support.',
      });
    }

    return res.json({ success: true, data: { authorizationUrl } });
  } catch (error) {
    console.error('NSE client authorization link error:', error.message);
    const status = error.statusCode === 401 || error.statusCode === 403
      ? error.statusCode
      : error.message === 'NSE_NOT_CONFIGURED' ? 503 : 502;
    return res.status(status).json({
      success: false,
      message: status === 503
        ? 'NSE authorization service is not configured. Please contact support.'
        : 'Unable to retrieve your NSE authorization link. Please try again or contact support.',
    });
  }
});

async function getAndStoreNseAccountStatus(userId) {
  await ensureAccountOpeningColumns();
  const result = await pool.query(
      `SELECT account_opening_status, nse_status, nse_status_remark, pan,
              nse_status_checked_at, nse_client_code, nse_ucc_registered,
              nse_ucc_registered_at, nse_reg_id, nse_status_details,
              fatca_status, fatca_remark, fatca_prefill_details, created_at
       FROM users WHERE id = $1 LIMIT 1`,
    [userId]
  );
  const row = result.rows[0];
  if (!row) return { row: null };

  const statusCheckErrors = [];
  let report = null;
  let authorizationReport = null;
  let clientDetailResponse = null;
  let authorizationResponse = null;
  let reportRowsCount = 0;
  let reportQuerySucceeded = false;
  const clientCode = String(row.nse_client_code || '').trim();

  if (clientCode) {
    try {
      clientDetailResponse = await callNseRegistration(
        '/nsemfdesk/api/v2/reports/CLIENT_DETAIL_REPORT',
        {
          from_date: formatNseReportDate(row.nse_ucc_registered_at || row.created_at),
          to_date: formatNseReportDate(),
          client_code: clientCode,
        },
        'Dhanvo-NSE-Client-Report/1.0'
      );
      reportQuerySucceeded = true;
      const reportRows = Array.isArray(clientDetailResponse?.report_data)
        ? clientDetailResponse.report_data
        : [];
      reportRowsCount = reportRows.length;
      report = findNseClientReport(reportRows, clientCode, row.pan);
      if (!report) {
        statusCheckErrors.push(
          reportRows.length
            ? 'NSE returned report rows, but none could be safely matched by client code or PAN'
            : 'NSE client detail report returned no client records'
        );
      }
    } catch (error) {
      statusCheckErrors.push(error.message || 'NSE client detail report unavailable');
    }

    try {
      authorizationResponse = await callNseRegistration(
        '/nsemfdesk/api/v2/reports/client_authorization',
        {
          from_date: formatNseReportDate(row.nse_ucc_registered_at || row.created_at),
          to_date: formatNseReportDate(),
          client_code: clientCode,
        },
        'Dhanvo-NSE-Client-Authorization/1.0'
      );
      const authorizationRows = Array.isArray(authorizationResponse?.report_data)
        ? authorizationResponse.report_data
        : [];
      authorizationReport = findNseClientReport(authorizationRows, clientCode, row.pan);
    } catch (error) {
      statusCheckErrors.push(error.message || 'NSE client authorization report unavailable');
    }
  } else {
    statusCheckErrors.push('NSE client code is unavailable for this account');
  }

  const reportDetails = report ? {
    authStatus: getNseReportField(authorizationReport, ['auth_status', 'authorization_status']) || null,
    uccStatus: getNseReportField(report, ['ucc_status']) || null,
    uccRemediation: getNseReportField(report, ['ucc_remediation']) || null,
    primaryHolderKycStatus: getNseReportField(report, ['primary_holder_kyc_status']) || null,
    primaryHolderKycRemarks: getNseReportField(report, ['primary_holder_kyc_status_remarks', 'primary_holder_kyc_remarks']) || null,
    dematStatus: getNseReportField(report, ['demat_status']) || null,
    bank1Status: getNseReportField(report, ['bank1_status']) || null,
    bank1RejectionRemarks: getNseReportField(report, ['bank1_rejection_remarks']) || null,
  } : row.nse_status_details ? {
    ...row.nse_status_details,
    authStatus: authorizationReport?.auth_status || null,
  } : authorizationReport ? {
    authStatus: authorizationReport.auth_status || null,
  } : null;

  const rawUccStatus = getNseReportField(report, ['ucc_status']);
  const uccRemediation = getNseReportField(report, ['ucc_remediation']);
  const nseStatus = report
    ? normalizeUccStatus(rawUccStatus, uccRemediation)
    : String(row.nse_status || 'PENDING').trim().toUpperCase();
  const isUccRegistered = String(rawUccStatus).trim().toUpperCase() === 'ACTIVE';
  const nseStatusRemark = report
    ? uccRemediation
      || getNseReportField(report, ['primary_holder_kyc_status_remarks', 'primary_holder_kyc_remarks'])
      || rawUccStatus
      || 'NSE report received'
    : row.nse_status_remark || 'Awaiting NSE validation';
  const accountOpeningStatus = nseStatus === 'ACTIVE'
    ? 'COMPLETED'
    : nseStatus === 'FAILED' ? 'FAILED' : nseStatus === 'ACTION_REQUIRED' ? 'ACTION_REQUIRED' : 'PENDING';
  let statusResultChanged = false;
  let checkedAt = row.nse_status_checked_at;
  if (report && nseStatus) {
    const updateResult = await pool.query(
      `UPDATE users
       SET account_opening_status = $1,
           nse_status = $2,
           nse_status_remark = $3,
           nse_status_checked_at = NOW(),
           nse_status_details = $4::jsonb,
           nse_ucc_registered = $5,
           nse_ucc_registered_at = CASE
             WHEN $5 THEN COALESCE(nse_ucc_registered_at, NOW())
             ELSE NULL
           END
       WHERE id = $6
         AND (
           account_opening_status IS DISTINCT FROM $1
           OR nse_status IS DISTINCT FROM $2
           OR nse_status_remark IS DISTINCT FROM $3
           OR nse_status_details IS DISTINCT FROM $4::jsonb
           OR nse_ucc_registered IS DISTINCT FROM $5
           OR ($5 AND nse_ucc_registered_at IS NULL)
         )
       RETURNING nse_status_checked_at`,
      [
        accountOpeningStatus,
        nseStatus,
        nseStatusRemark,
        JSON.stringify(reportDetails || {}),
        isUccRegistered,
        userId,
      ]
    );
    statusResultChanged = updateResult.rowCount > 0;
    if (statusResultChanged) checkedAt = updateResult.rows[0].nse_status_checked_at;
  } else if (report) {
    statusCheckErrors.push('NSE report did not include a recognized UCC status; stored account status was left unchanged');
  }

  return {
    row,
    report,
    clientDetailResponse,
    authorizationResponse,
    statusCheckErrors,
    reportDetails,
    nseStatus,
    nseStatusRemark,
    accountOpeningStatus,
    isUccRegistered,
    nseStatusCheckedAt: checkedAt,
    checked: Boolean(report && nseStatus),
    changed: statusResultChanged,
    reportRowsCount,
    reportQuerySucceeded,
    clientCodePresent: Boolean(clientCode),
  };
}

export async function refreshNseAccountStatus(userId) {
  return getAndStoreNseAccountStatus(userId);
}

router.get('/account-opening-status', protect, async (req, res) => {
  try {
    const statusResult = await getAndStoreNseAccountStatus(req.user._id);
    const {
      row,
      report,
      clientDetailResponse,
      authorizationResponse,
      statusCheckErrors,
      reportDetails,
      nseStatus,
      nseStatusRemark,
      accountOpeningStatus,
      isUccRegistered,
      nseStatusCheckedAt,
    } = statusResult;

    if (!row) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    const clientCode = String(row.nse_client_code || '').trim();

    const fatcaPrefill = { ...(row.fatca_prefill_details || {}) };
    if (!fatcaPrefill.dateOfBirth) {
      fatcaPrefill.dateOfBirth = report?.primary_holder_dob || report?.primary_holder_dob_incorporation || '';
    }
    if (clientCode && !fatcaPrefill.occupation && !fatcaPrefill.occupationLookupAttempted) {
      try {
        const masterResponse = await callNseRegistration(
          '/nsemfdesk/api/v2/reports/client_master_report',
          { client_code: clientCode },
          'Dhanvo-NSE-Client-Master/1.0'
        );
        const masterRecord = Array.isArray(masterResponse?.report_data)
          ? masterResponse.report_data.find((item) => String(item?.client_code || '').trim() === clientCode) || masterResponse.report_data[0] || null
          : null;
        fatcaPrefill.occupation = String(masterRecord?.occupation_code || '').trim();
      } catch {
        fatcaPrefill.occupation = '';
      }
      fatcaPrefill.occupationLookupAttempted = true;
    }
    if (fatcaPrefill.dateOfBirth || fatcaPrefill.occupationLookupAttempted) {
      await pool.query(
        'UPDATE users SET fatca_prefill_details = $1::jsonb WHERE id = $2',
        [JSON.stringify(fatcaPrefill), req.user._id]
      );
    }

    return res.json({
      success: true,
      data: {
        accountOpeningStatus,
        nseStatus,
        nseStatusRemark,
        nseStatusCheckedAt,
        nseStatusCheckError: statusCheckErrors.join('; ') || null,
        nseStatusDetails: reportDetails,
        nseResponse: {
          clientDetailReport: clientDetailResponse,
          authorizationReport: authorizationResponse,
        },
        pan: row.pan || null,
        nseClientCode: row.nse_client_code,
        nseUccRegistered: report
          ? isUccRegistered
          : Boolean(row.nse_ucc_registered),
        nseUccRegisteredAt: report
          ? isUccRegistered
            ? row.nse_ucc_registered_at || nseStatusCheckedAt
            : null
          : row.nse_ucc_registered_at,
        applicationId: row.nse_reg_id,
        fatcaStatus: row.fatca_status || 'NOT_SUBMITTED',
        fatcaRemark: row.fatca_remark || null,
        fatcaPrefill: {
          dateOfBirth: fatcaPrefill.dateOfBirth || '',
          occupation: fatcaPrefill.occupation || '',
        },
      },
    });
  } catch (error) {
    console.error('Account status error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load account status' });
  }
});

router.post('/verify-bank', async (req, res) => {
  const bankDtl = Array.isArray(req.body?.bank_dtl) ? req.body.bank_dtl : [req.body || {}];
  const email = String(req.body?.email || '').trim().toLowerCase();
  const phone = String(req.body?.phone || '').trim();
  const userId = req.body?.userId || req.body?.id || null;

  if (!bankDtl.length) {
    return res.status(400).json({
      success: false,
      message: 'Bank details are required',
    });
  }

  try {
    requiredEnv();
    const cfg = getNseConfig();
    const encryptedPwd = encryptedPassword();
    const basicAuth = Buffer.from(`${cfg.loginUser}:${encryptedPwd}`, 'utf8').toString('base64');

    const candidate = await User.findOne({ $or: [{ email }, { phone }] });
    const user = candidate || (userId ? await User.findById(userId) : null);

    const existing = user ? await getExistingClientCode({
      email: user.email,
      phone: user.phone,
      userId: user._id,
    }) : await getExistingClientCode({ email, phone, userId });

    const clientCode = existing.clientCode;

    if (!clientCode || !existing.isRegistered) {
      return res.status(400).json({
        success: false,
        message: 'NSE UCC is not registered for this user',
      });
    }

    const normalizedBankDtl = bankDtl.map((bank, index) => {
      const actionType = String(bank.action_type || bank.actionType || 'ADD').trim().toUpperCase();
      const accountType = String(bank.account_type || bank.accountType || 'SB').trim().toUpperCase();
      const accountNo = String(bank.account_no || bank.accountNumber || '').trim();
      const ifscCode = String(bank.ifsc_code || bank.ifsc || '').trim().toUpperCase();
      const micrNo = String(bank.micr_no || bank.micr || '').trim();
      const defaultBankFlag = String(bank.default_bank_flag || bank.defaultBankFlag || (index === 0 ? 'Y' : 'N')).trim().toUpperCase();

      if (!accountNo) {
        throw new Error('Bank account number is required');
      }
      if (!ifscCode) {
        throw new Error('IFSC code is required');
      }

      return {
        client_code: clientCode,
        action_type: actionType,
        account_type: accountType,
        account_no: accountNo,
        micr_no: micrNo,
        ifsc_code: ifscCode,
        default_bank_flag: defaultBankFlag,
      };
    });

    const response = await fetch(`${cfg.baseUrl}/nsemfdesk/api/v2/registration/CLIENTBANKDTL`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Language': 'en-US',
        Referer: 'www.google.com',
        'User-Agent': 'Dhanvo-NSE-Bank/1.0',
        memberId: String(cfg.memberId),
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify({ bank_dtl: normalizedBankDtl }),
    });

    const body = await response.json().catch(() => ({}));
    const results = Array.isArray(body?.bank_dtl) ? body.bank_dtl : [];

    if (!response.ok) {
      return res.status(response.status === 403 ? 502 : 502).json({
        success: false,
        message: body?.message || 'NSE bank verification failed',
      });
    }

    const verified = results.length > 0 && results.every((item) => {
      const status = String(item?.status || '').trim().toUpperCase();
      return status === 'SUCCESS' || status === 'SUCCESSFUL';
    });

    return res.json({
      success: true,
      data: {
        verified,
        client_code: clientCode,
        bank_dtl: results,
        summary: {
          total: results.length,
          success: results.filter((item) => ['SUCCESS', 'SUCCESSFUL'].includes(String(item?.status || '').trim().toUpperCase())).length,
          failed: results.filter((item) => !['SUCCESS', 'SUCCESSFUL'].includes(String(item?.status || '').trim().toUpperCase())).length,
        },
      },
    });
  } catch (error) {
    console.error('BANK verification error:', error.message);
    const status = error.message === 'NSE_NOT_CONFIGURED' ? 503 : 502;
    return res.status(status).json({
      success: false,
      message: status === 503 ? 'NSE bank verification service is not configured' : error.message || 'Unable to reach NSE bank verification service',
    });
  }
});

export default router;
