import express from 'express';
import crypto from 'crypto';
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
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

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

const buildUserFromIdentifier = (email, phone) => {
  const cleanedEmail = String(email || '').trim().toLowerCase();
  const cleanedPhone = String(phone || '').trim();

  let firstName = 'Dhanvo';
  let lastName = 'User';

  if (cleanedEmail) {
    const localPart = cleanedEmail.split('@')[0] || 'Dhanvo';
    firstName = localPart.charAt(0).toUpperCase() + localPart.slice(1);
  }

  return {
    firstName: firstName.slice(0, 50) || 'Dhanvo',
    lastName: lastName.slice(0, 50) || 'User',
    email: cleanedEmail || `${cleanedPhone}@dhanvo.local`,
    phone: cleanedPhone,
    password: `Dhanvo@${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
  };
};

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
      'UPDATE signup_otps SET verified_at=NOW() WHERE ((email=$1 AND $1 <> \'\') OR (phone=$2 AND $2 <> \'\')) AND verified_at IS NULL',
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
        text: `Welcome to DHANVO!\n\nYour registration OTP is ${o}. This OTP is valid for 10 minutes. Please do not share this OTP with anyone.\n\nTRUST, TECHNOLOGY & TRANSPARANCY.\nBuilt on your trust. Driven by technology. Committed to transparency.\n\nThank you for choosing DHANVO.`,
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
  const hasEmail = Boolean(e && ve.test(e));
  const hasPhone = Boolean(p && vp.test(p));

  if ((!hasEmail && !hasPhone) || !/^[0-9]{6}$/.test(o)) {
    return s.status(400).json({ success: false, message: 'Valid email or phone and 6-digit OTP are required' });
  }

  try {
    const emailValue = hasEmail ? e : `${p}@dhanvo.local`;
    const phoneValue = hasPhone ? p : '';

    const z = (await pool.query(
      "SELECT * FROM signup_otps WHERE ((email=$1 AND $1 <> '') OR (phone=$2 AND $2 <> '')) AND verified_at IS NULL AND expires_at>NOW() AND attempts<5 ORDER BY created_at DESC LIMIT 1",
      [emailValue, phoneValue]
    )).rows[0];

    const h = crypto.createHash('sha256').update(o).digest('hex');

    if (!z || z.otp_hash !== h) {
      if (z) {
        await pool.query('UPDATE signup_otps SET attempts=attempts+1 WHERE id=$1', [z.id]);
      }
      return s.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    await pool.query('UPDATE signup_otps SET verified_at=NOW() WHERE id=$1', [z.id]);
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
      "SELECT * FROM signup_otps WHERE ((email=$1 AND $1 <> '') OR (phone=$2 AND $2 <> '')) AND verified_at IS NULL AND expires_at>NOW() AND attempts<5 ORDER BY created_at DESC LIMIT 1",
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

    let user = await User.findOne({ $or: [{ email: lookupEmail }, { phone: lookupPhone }] });

    if (!user) {
      const created = buildUserFromIdentifier(lookupEmail, lookupPhone);
      user = await User.create({
        firstName: created.firstName,
        lastName: created.lastName,
        email: created.email,
        phone: created.phone,
        password: created.password,
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