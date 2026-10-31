import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { pool } from '../config/db.js';
import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';

const r = express.Router();
const ve = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const vp = /^[0-9]{10}$/;

const ensureSignupOtpTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS signup_otps (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255),
      phone VARCHAR(20),
      otp_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      verified_at TIMESTAMP,
      attempts INTEGER NOT NULL DEFAULT 0,
      login_secret_hash VARCHAR(255),
      login_secret_type VARCHAR(10),
      purpose VARCHAR(20) NOT NULL DEFAULT 'signup',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('ALTER TABLE signup_otps ADD COLUMN IF NOT EXISTS login_secret_hash VARCHAR(255)');
  await pool.query('ALTER TABLE signup_otps ADD COLUMN IF NOT EXISTS login_secret_type VARCHAR(10)');
  await pool.query("ALTER TABLE signup_otps ADD COLUMN IF NOT EXISTS purpose VARCHAR(20) NOT NULL DEFAULT 'signup'");

  await pool.query(`
    CREATE INDEX IF NOT EXISTS signup_otps_lookup_idx
    ON signup_otps (email, phone, verified_at, expires_at, attempts, created_at)
  `);
};

const mail = () => {
  const k = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'];
  if (k.some((x) => !process.env[x])) throw Error('SMTP_NOT_CONFIGURED');

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: +process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendRecoveryOtp = async (req, res) => {
  const rawEmail = String(req.body?.email || '').trim();
  const rawPhone = String(req.body?.phone || req.body?.mobile || '').trim();
  const email = rawEmail.toLowerCase();
  const phone = rawPhone;
  const hasEmail = Boolean(email && ve.test(email));
  const hasPhone = Boolean(phone && vp.test(phone));

  if ((!hasEmail && !hasPhone) || (rawEmail && !hasEmail) || (rawPhone && !hasPhone)) {
    return res.status(400).json({ success: false, message: 'Enter a valid email or 10-digit mobile number' });
  }

  try {
    await ensureSignupOtpTable();
    const user = hasEmail
      ? await User.findOne({ email })
      : await User.findOne({ phone });
    if (!user || (hasPhone && user.phone !== phone)) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User does not exist',
      });
    }
    const emailValue = String(user.email || '').trim().toLowerCase();
    const phoneValue = String(user.phone || '').trim();
    if (!ve.test(emailValue)) {
      return res.status(503).json({
        success: false,
        message: 'Recovery OTP delivery is unavailable for this account. Please contact support.',
      });
    }

    const otp = String(crypto.randomInt(100000, 1000000));
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    await pool.query(
      `UPDATE signup_otps
       SET verified_at = NOW()
       WHERE ((email = $1 AND $1 <> '') OR (phone = $2 AND $2 <> ''))
         AND purpose = 'recovery'
         AND verified_at IS NULL`,
      [emailValue, phoneValue]
    );
    await pool.query(
      `INSERT INTO signup_otps (email, phone, otp_hash, expires_at, purpose)
       VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes', 'recovery')`,
      [emailValue, phoneValue, otpHash]
    );

    await mail().sendMail({
      from: process.env.MAIL_FROM,
      to: emailValue,
      subject: 'Your DHANVO Password Reset OTP',
      text: `Your DHANVO password reset OTP is ${otp}. This OTP is valid for 10 minutes. Please do not share this OTP with anyone.\n\nIf you did not request a password reset, please ignore this message.\n\nDHANVO -\nTRUST, TECHNOLOGY & TRANSPARANCY.\nBuilt on your trust. Driven by technology. Committed to transparency.`,
    });

    return res.json({ success: true, message: 'Recovery OTP sent successfully' });
  } catch (error) {
    console.error('Recovery OTP send error:', error.message);
    return res.status(error.message === 'SMTP_NOT_CONFIGURED' ? 503 : 500).json({
      success: false,
      message: error.message === 'SMTP_NOT_CONFIGURED' ? 'Email service is not configured' : 'Unable to send recovery OTP',
    });
  }
};

r.post('/send-recovery-otp', sendRecoveryOtp);

r.post('/reset-credential', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const phone = String(req.body?.phone || req.body?.mobile || '').trim();
  const otp = String(req.body?.otp || '').trim();
  const credentialType = String(req.body?.credentialType || '').trim().toLowerCase();
  const credential = String(req.body?.credential || '');
  const hasEmail = Boolean(email && ve.test(email));
  const hasPhone = Boolean(phone && vp.test(phone));

  if ((!hasEmail && !hasPhone) || !/^\d{6}$/.test(otp) ||
      (req.body?.email && !hasEmail) ||
      ((req.body?.phone || req.body?.mobile) && !hasPhone)) {
    return res.status(400).json({ success: false, message: 'Enter a valid registered email or mobile number and 6-digit OTP' });
  }
  if (
    (credentialType !== 'password' && credentialType !== 'pin') ||
    (credentialType === 'password' && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(credential)) ||
    (credentialType === 'pin' && !/^\d{6}$/.test(credential))
  ) {
    return res.status(400).json({
      success: false,
      message: credentialType === 'pin'
        ? 'Choose a 6-digit PIN'
        : 'Choose a password with at least 8 characters, including uppercase, lowercase, and a number',
    });
  }

  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  let client;
  let transactionStarted = false;
  try {
    await ensureSignupOtpTable();
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS login_credential_type VARCHAR(10) NOT NULL DEFAULT 'password'");
    client = await pool.connect();
    const user = hasEmail
      ? await User.findOne({ email })
      : await User.findOne({ phone });
    if (!user || (hasPhone && user.phone !== phone)) {
      return res.status(404).json({ success: false, code: 'USER_NOT_FOUND', message: 'User does not exist' });
    }

    const emailValue = String(user.email || '').trim().toLowerCase();
    const phoneValue = String(user.phone || '').trim();
    await client.query('BEGIN');
    transactionStarted = true;
    const record = (await client.query(
      `SELECT id, otp_hash FROM signup_otps
       WHERE email = $1 AND phone = $2 AND purpose = 'recovery'
         AND verified_at IS NULL AND expires_at > NOW() AND attempts < 5
       ORDER BY created_at DESC LIMIT 1
       FOR UPDATE`,
      [emailValue, phoneValue]
    )).rows[0];
    if (!record || record.otp_hash !== otpHash) {
      if (record) {
        await client.query('UPDATE signup_otps SET attempts = attempts + 1 WHERE id = $1', [record.id]);
      }
      await client.query('COMMIT');
      transactionStarted = false;
      return res.status(400).json({ success: false, message: 'Invalid or expired recovery OTP' });
    }

    const credentialHash = await bcrypt.hash(credential, 10);
    await client.query(
      'UPDATE users SET password = $1, login_credential_type = $2 WHERE id = $3',
      [credentialHash, credentialType, user._id]
    );
    await client.query('UPDATE signup_otps SET verified_at = NOW() WHERE id = $1', [record.id]);
    await client.query('COMMIT');
    transactionStarted = false;
    return res.json({ success: true, message: `${credentialType === 'pin' ? 'PIN' : 'Password'} reset successfully` });
  } catch (error) {
    if (transactionStarted) await client.query('ROLLBACK');
    console.error('Credential reset error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to reset your login credential' });
  } finally {
    client?.release();
  }
});

r.post('/check-signup-account', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const phone = String(req.body?.phone || req.body?.mobile || '').trim();

  if ((!email || !ve.test(email)) && (!phone || !vp.test(phone))) {
    return res.status(400).json({ success: false, message: 'A valid email or 10-digit phone is required' });
  }

  try {
    const identifiers = [];
    if (email && ve.test(email)) identifiers.push({ email });
    if (phone && vp.test(phone)) identifiers.push({ phone });

    const existingUser = await User.findOne({ $or: identifiers });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        code: 'ACCOUNT_EXISTS',
        message: 'An account with this email or mobile already exists. Please sign in instead.',
      });
    }

    return res.json({ success: true, data: { available: true } });
  } catch (error) {
    console.error('Signup account check error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to check account availability' });
  }
});

r.post('/send-otp', async (q, s) => {
  try {
    await ensureSignupOtpTable();
  } catch (error) {
    console.error('OTP table init error:', error.message);
    return s.status(500).json({ success: false, message: 'Unable to initialize OTP service' });
  }

  const e = String(q.body.email || '').trim().toLowerCase();
  const p = String(q.body.phone || q.body.mobile || '').trim();
  const hasEmail = Boolean(e && ve.test(e));
  const hasPhone = Boolean(p && vp.test(p));

  if (!hasEmail && !hasPhone) {
    return s.status(400).json({ success: false, message: 'Valid email or 10-digit phone is required' });
  }

  try {
    const emailValue = hasEmail ? e : `${p}@dhanvo.local`;
    const phoneValue = hasPhone ? p : '';
    const o = crypto.randomInt(100000, 1000000) + '';
    const h = crypto.createHash('sha256').update(o).digest('hex');

    await pool.query(
      "UPDATE signup_otps SET verified_at=NOW() WHERE ((email=$1 AND $1 <> '') OR (phone=$2 AND $2 <> '')) AND purpose='signup' AND verified_at IS NULL",
      [emailValue, phoneValue]
    );
    await pool.query(
      "INSERT INTO signup_otps(email,phone,otp_hash,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '10 minutes')",
      [emailValue, phoneValue, h]
    );

    if (hasEmail) {
      await mail().sendMail({
        from: process.env.MAIL_FROM,
        to: e,
        subject: 'Your Verification OTP – Dhanvo',
        text: `Welcome to DHANVO!\n\nYour registration OTP is ${o}. This OTP is valid for 10 minutes. Please do not share this OTP with anyone.\n\nDHANVO -\nTRUST, TECHNOLOGY & TRANSPARANCY.\nBuilt on your trust. Driven by technology. Committed to transparency.\n\nThank you for choosing DHANVO.`,
      });
    }

    return s.json({ success: true, message: 'OTP sent successfully' });
  } catch (x) {
    console.error(x.message);
    return s.status(x.message === 'SMTP_NOT_CONFIGURED' ? 503 : 500).json({
      success: false,
      message: x.message === 'SMTP_NOT_CONFIGURED' ? 'Email service is not configured' : 'Unable to send OTP',
    });
  }
});

r.post('/send-login-otp', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const phone = String(req.body?.phone || req.body?.mobile || '').trim();
  const hasEmail = Boolean(email && ve.test(email));
  const hasPhone = Boolean(phone && vp.test(phone));

  if ((!hasEmail && !hasPhone) || (req.body?.email && !hasEmail) ||
      ((req.body?.phone || req.body?.mobile) && !hasPhone)) {
    return res.status(400).json({ success: false, message: 'Enter a valid email or 10-digit mobile number' });
  }

  try {
    await ensureSignupOtpTable();
    const user = hasEmail
      ? await User.findOne({ email })
      : await User.findOne({ phone });
    if (!user || (hasPhone && user.phone !== phone)) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User does not exist',
      });
    }

    const emailValue = String(user.email || '').trim().toLowerCase();
    const phoneValue = String(user.phone || '').trim();
    if (!ve.test(emailValue)) {
      return res.status(503).json({
        success: false,
        message: 'Login OTP delivery is unavailable for this account. Please contact support.',
      });
    }

    const otp = String(crypto.randomInt(100000, 1000000));
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    await pool.query(
      `UPDATE signup_otps
       SET verified_at = NOW()
       WHERE email = $1 AND phone = $2 AND purpose = 'login' AND verified_at IS NULL`,
      [emailValue, phoneValue]
    );
    await pool.query(
      `INSERT INTO signup_otps (email, phone, otp_hash, expires_at, purpose)
       VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes', 'login')`,
      [emailValue, phoneValue, otpHash]
    );

    await mail().sendMail({
      from: process.env.MAIL_FROM,
      to: emailValue,
      subject: 'Your DHANVO Login OTP',
      text: `Welcome back to DHANVO!\n\nYour login OTP is ${otp}. This OTP is valid for 10 minutes. Please do not share this OTP with anyone.\n\nDHANVO -\nTRUST, TECHNOLOGY & TRANSPARANCY.\nBuilt on your trust. Driven by technology. Committed to transparency.`,
    });
    return res.json({ success: true, message: 'Login OTP sent successfully' });
  } catch (error) {
    console.error('Login OTP send error:', error.message);
    return res.status(error.message === 'SMTP_NOT_CONFIGURED' ? 503 : 500).json({
      success: false,
      message: error.message === 'SMTP_NOT_CONFIGURED' ? 'Email service is not configured' : 'Unable to send login OTP',
    });
  }
});

r.post('/verify-otp', async (q, s) => {
  try {
    await ensureSignupOtpTable();
  } catch (error) {
    console.error('OTP verify init error:', error.message);
    return s.status(500).json({ success: false, message: 'Unable to initialize OTP verification' });
  }

  const e = String(q.body.email || '').trim().toLowerCase();
  const p = String(q.body.phone || q.body.mobile || '').trim();
  const o = String(q.body.otp || '').trim();
  const credentialType = String(q.body.credentialType || '').trim().toLowerCase();
  const credential = String(q.body.credential || '');
  const hasEmail = Boolean(e && ve.test(e));
  const hasPhone = Boolean(p && vp.test(p));
  const hasCredential = Boolean(credentialType || credential);

  if ((!hasEmail && !hasPhone) || !/^[0-9]{6}$/.test(o)) {
    return s.status(400).json({ success: false, message: 'Valid email or phone and 6-digit OTP are required' });
  }
  if (hasCredential && (
    (credentialType !== 'password' && credentialType !== 'pin') ||
    (credentialType === 'password' && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(credential)) ||
    (credentialType === 'pin' && !/^\d{6}$/.test(credential))
  )) {
    return s.status(400).json({
      success: false,
      message: credentialType === 'pin'
        ? 'Choose a 6-digit PIN'
        : 'Choose a password with at least 8 characters, including uppercase, lowercase, and a number',
    });
  }

  try {
    const emailValue = hasEmail ? e : `${p}@dhanvo.local`;
    const phoneValue = hasPhone ? p : '';

    const z = (await pool.query(
      "SELECT * FROM signup_otps WHERE ((email=$1 AND $1 <> '') OR (phone=$2 AND $2 <> '')) AND purpose='signup' AND verified_at IS NULL AND expires_at>NOW() AND attempts<5 ORDER BY created_at DESC LIMIT 1",
      [emailValue, phoneValue]
    )).rows[0];

    const h = crypto.createHash('sha256').update(o).digest('hex');

    if (!z || z.otp_hash !== h) {
      if (z) {
        await pool.query('UPDATE signup_otps SET attempts=attempts+1 WHERE id=$1', [z.id]);
      }
      return s.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    if (hasCredential) {
      const identifiers = [];
      if (hasEmail) identifiers.push({ email: e });
      if (hasPhone) identifiers.push({ phone: p });
      if (await User.findOne({ $or: identifiers })) {
        return s.status(409).json({
          success: false,
          code: 'ACCOUNT_EXISTS',
          message: 'An account with this email or mobile already exists. Please sign in instead.',
        });
      }
    }

    if (hasCredential) {
      const loginSecretHash = await bcrypt.hash(credential, 10);
      await pool.query(
        'UPDATE signup_otps SET verified_at=NOW(), login_secret_hash=$1, login_secret_type=$2 WHERE id=$3',
        [loginSecretHash, credentialType, z.id]
      );
    } else {
      await pool.query('UPDATE signup_otps SET verified_at=NOW() WHERE id=$1', [z.id]);
    }
    return s.json({ success: true, message: 'OTP verified successfully' });
  } catch (x) {
    console.error(x.message);
    return s.status(500).json({ success: false, message: 'Unable to verify OTP' });
  }
});

r.post('/login-otp', async (req, res) => {
  try {
    await ensureSignupOtpTable();
  } catch (error) {
    console.error('OTP login init error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to initialize OTP login' });
  }

  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || req.body.mobile || '').trim();
  const otp = String(req.body.otp || '').trim();

  if ((!email && !phone) || !/^[0-9]{6}$/.test(otp)) {
    return res.status(400).json({
      success: false,
      message: 'Valid email or phone and 6-digit OTP are required',
    });
  }

  try {
    const lookupEmail = email || null;
    const lookupPhone = phone || null;
    const emailValue = lookupEmail || `${lookupPhone}@dhanvo.local`;
    const phoneValue = lookupPhone || '';

    const recentOtp = (await pool.query(
      "SELECT * FROM signup_otps WHERE ((email=$1 AND $1 <> '') OR (phone=$2 AND $2 <> '')) AND purpose='login' AND verified_at IS NULL AND expires_at>NOW() AND attempts<5 ORDER BY created_at DESC LIMIT 1",
      [emailValue, phoneValue]
    )).rows[0];

    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    if (!recentOtp || recentOtp.otp_hash !== hashedOtp) {
      if (recentOtp) {
        await pool.query('UPDATE signup_otps SET attempts=attempts+1 WHERE id=$1', [recentOtp.id]);
      }
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    await pool.query('UPDATE signup_otps SET verified_at=NOW() WHERE id=$1', [recentOtp.id]);

    const identifiers = [];
    if (lookupEmail) identifiers.push({ email: lookupEmail });
    if (lookupPhone) identifiers.push({ phone: lookupPhone });
    const user = await User.findOne({ $or: identifiers });

    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User does not exist',
      });
    }

    const token = generateToken(user._id);

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        nseClientCode: user.nseClientCode,
        accountBalance: user.accountBalance,
        isVerified: user.isVerified,
        portfolio: user.portfolio,
        watchlist: user.watchlist,
        token,
      },
    });
  } catch (error) {
    console.error('OTP login error:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to sign in with OTP' });
  }
});

export default r;