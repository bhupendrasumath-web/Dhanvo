import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool } from '../config/db.js';

function generateNseClientCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'D';

  for (let i = 0; i < 9; i += 1) {
    code += chars[crypto.randomInt(0, chars.length)];
  }

  return code;
}

async function ensureNseClientCodeColumn() {
  await pool.query(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS nse_client_code VARCHAR(10)'
  );
  await pool.query(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS nse_ucc_registered BOOLEAN DEFAULT FALSE'
  );
  await pool.query(
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS nse_ucc_registered_at TIMESTAMP'
  );
  await pool.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS users_nse_client_code_unique ON users(nse_client_code) WHERE nse_client_code IS NOT NULL'
  );
}

async function generateUniqueNseClientCode() {
  await ensureNseClientCodeColumn();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = generateNseClientCode();
    const duplicate = await pool.query(
      'SELECT id FROM users WHERE nse_client_code = $1 LIMIT 1',
      [candidate]
    );

    if (duplicate.rowCount === 0) {
      return candidate;
    }
  }

  throw new Error('Unable to generate a unique NSE client code');
}

async function ensureNseClientCode(user) {
  if (!user) return null;

  await ensureNseClientCodeColumn();

  const existingCode = String(user.nseClientCode || '').trim();
  if (existingCode) return existingCode;

  const clientCode = await generateUniqueNseClientCode();

  await pool.query(
    'UPDATE users SET nse_client_code = $1, nse_ucc_registered = FALSE, nse_ucc_registered_at = NULL WHERE id = $2',
    [clientCode, user._id || user.id]
  );

  return clientCode;
}

function mapRow(row) {
  if (!row) return null;

  return {
    _id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    password: row.password,
    pan: row.pan,
    nseClientCode: row.nse_client_code,
    nseUccRegistered: Boolean(row.nse_ucc_registered),
    nseUccRegisteredAt: row.nse_ucc_registered_at,
    accountOpeningStatus: row.account_opening_status,
    nseStatus: row.nse_status,
    nseStatusRemark: row.nse_status_remark,
    nseStatusCheckedAt: row.nse_status_checked_at,
    nseRegId: row.nse_reg_id,
    accountBalance: row.account_balance,
    isVerified: row.is_verified,
    portfolio: row.portfolio,
    watchlist: row.watchlist,
    createdAt: row.created_at,

    async comparePassword(candidatePassword) {
      return bcrypt.compare(candidatePassword, row.password);
    },

    select() {
      return this;
    },

    async save() {
      const result = await pool.query(
        `UPDATE users
         SET first_name = $1,
             last_name = $2,
             email = $3,
             phone = $4,
             password = $5,
             pan = $6,
             nse_client_code = COALESCE($7, nse_client_code),
             nse_ucc_registered = COALESCE($8, nse_ucc_registered),
             nse_ucc_registered_at = CASE
               WHEN $8 = TRUE AND nse_ucc_registered_at IS NULL THEN NOW()
               WHEN $8 = FALSE THEN NULL
               ELSE nse_ucc_registered_at
             END
         WHERE id = $9
         RETURNING *`,
        [
          this.firstName,
          this.lastName,
          this.email?.toLowerCase(),
          this.phone,
          this.password,
          this.pan,
          this.nseClientCode || row.nse_client_code,
          this.nseUccRegistered,
          row.id,
        ]
      );

      return mapRow(result.rows[0]);
    }
  };
}

async function create(data) {
  const { firstName, lastName, email, phone, password, pan = null } = data;
  const hashedPassword = await bcrypt.hash(password, 10);

  await ensureNseClientCodeColumn();

  const result = await pool.query(
    `INSERT INTO users (
       first_name,
       last_name,
       email,
       phone,
       password,
       pan,
       nse_client_code,
       nse_ucc_registered,
       nse_ucc_registered_at
     ) VALUES ($1, $2, $3, $4, $5, $6, NULL, FALSE, NULL)
     RETURNING *`,
    [firstName, lastName, email.toLowerCase(), phone, hashedPassword, pan]
  );

  return mapRow(result.rows[0]);
}

async function findOne(query = {}) {
  if (query.$or && Array.isArray(query.$or)) {
    for (const condition of query.$or) {
      if (condition.email) return findOne({ email: condition.email });
      if (condition.phone) return findOne({ phone: condition.phone });
    }
    return null;
  }

  if (query.email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [query.email.toLowerCase()]
    );
    return mapRow(result.rows[0]);
  }

  if (query.phone) {
    const result = await pool.query(
      'SELECT * FROM users WHERE phone = $1 LIMIT 1',
      [query.phone]
    );
    return mapRow(result.rows[0]);
  }

  return null;
}

async function findById(id) {
  const result = await pool.query(
    'SELECT * FROM users WHERE id = $1 LIMIT 1',
    [id]
  );
  return mapRow(result.rows[0]);
}

const User = { create, findOne, findById, ensureNseClientCode, generateUniqueNseClientCode };

export default User;
export { create, findOne, findById, ensureNseClientCode, generateUniqueNseClientCode };