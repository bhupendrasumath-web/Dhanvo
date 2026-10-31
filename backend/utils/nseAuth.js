import crypto from 'crypto';

export function getNseConfig() {
  const baseUrl = (process.env.NSE_BASE_URL || process.env.NSE_API_BASE_URL || 'https://www.nseinvest.com').replace(/\/+$/, '');
  const loginUser = (process.env.NSE_LOGIN_USER_ID || process.env.NSE_USER_ID || '').trim();
  const apiSecret = (process.env.NSE_API_SECRET_USER || process.env.NSE_API_SECRET || '').trim();
  const memberLicenseKey = (process.env.NSE_MEMBER_LICENSE_KEY || process.env.NSE_API_KEY_MEMBER || '').trim();
  const memberCode = String(process.env.NSE_MEMBER_CODE || '').trim();
  const memberId = String(process.env.NSE_MEMBER_ID || memberCode || '').trim();

  return {
    baseUrl,
    loginUser,
    apiSecret,
    memberLicenseKey,
    memberId,
    memberCode,
  };
}

export function requiredEnv() {
  const cfg = getNseConfig();
  const missing = [
    ['baseUrl', cfg.baseUrl],
    ['loginUser', cfg.loginUser],
    ['apiSecret', cfg.apiSecret],
    ['memberLicenseKey', cfg.memberLicenseKey],
    ['memberId', cfg.memberId],
  ].filter(([, value]) => !value);

  if (missing.length) {
    const missingKeys = missing.map(([key]) => key).join(', ');
    throw new Error(`NSE_NOT_CONFIGURED: Missing ${missingKeys}`);
  }

  if (!/^\d+$/.test(String(cfg.memberId))) {
    throw new Error('NSE_NOT_CONFIGURED: Invalid NSE member ID');
  }
}

export function encryptedPassword() {
  requiredEnv();
  const cfg = getNseConfig();

  const randomNumber = Math.floor((Math.random() * 10000000000) + 1);
  const plainText = `${cfg.apiSecret}|${randomNumber}`;
  const iv = crypto.randomBytes(16).toString('hex');
  const salt = crypto.randomBytes(16).toString('hex');

  const key = crypto.pbkdf2Sync(
    cfg.memberLicenseKey,
    Buffer.from(salt, 'hex'),
    1000,
    16,
    'sha1'
  );

  const cipher = crypto.createCipheriv(
    'aes-128-cbc',
    key,
    Buffer.from(iv, 'hex')
  );

  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]).toString('base64');

  return Buffer.from(`${iv}::${salt}::${encrypted}`, 'utf8').toString('base64');
}
