import dotenv from 'dotenv';
import { pool } from '../config/db.js';

dotenv.config();

const [, , action = '--dry-run', rawEmail] = process.argv;
const email = String(rawEmail || '').trim().toLowerCase();

function usage() {
  process.stderr.write(
    'Usage: node scripts/deleteUserData.js [--dry-run|--delete] <user-email>\n'
  );
  process.exitCode = 2;
}

async function main() {
  if (!['--dry-run', '--delete'].includes(action) || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    usage();
    return;
  }

  const client = await pool.connect();
  let transactionStarted = false;
  try {
    await client.query('BEGIN');
    transactionStarted = true;

    const userResult = await client.query(
      `SELECT id, lower(btrim(email)) AS email, phone, upper(pan) AS pan
       FROM public.users
       WHERE lower(btrim(email)) = $1
       FOR UPDATE`,
      [email]
    );

    if (userResult.rowCount !== 1) {
      throw new Error(
        userResult.rowCount === 0
          ? 'No matching user was found; no data was changed.'
          : 'More than one matching user was found; no data was changed.'
      );
    }

    const user = userResult.rows[0];
    const counts = await client.query(
      `SELECT
         (SELECT COUNT(*)::int FROM public.users WHERE id = $1) AS users,
         (SELECT COUNT(*)::int FROM public.signup_otps
          WHERE lower(btrim(email)) = $2 OR ($3 <> '' AND phone = $3)) AS signup_otps,
         (SELECT COUNT(*)::int FROM public.pan_kyc_checks
          WHERE lower(btrim(email)) = $2
             OR ($3 <> '' AND phone = $3)
             OR ($4::text IS NOT NULL AND upper(pan) = upper($4::text))) AS pan_kyc_checks`,
      [user.id, user.email, user.phone || '', user.pan]
    );

    process.stdout.write(`Matching production database rows for ${user.email}:\n`);
    for (const [table, count] of Object.entries(counts.rows[0])) {
      process.stdout.write(`  ${table}: ${count}\n`);
    }

    if (action === '--dry-run') {
      await client.query('ROLLBACK');
      transactionStarted = false;
      process.stdout.write('Dry run only: nothing was deleted.\n');
      return;
    }

    const otpResult = await client.query(
      `DELETE FROM public.signup_otps
       WHERE lower(btrim(email)) = $1 OR ($2 <> '' AND phone = $2)`,
      [user.email, user.phone || '']
    );
    const kycResult = await client.query(
      `DELETE FROM public.pan_kyc_checks
       WHERE lower(btrim(email)) = $1
          OR ($2 <> '' AND phone = $2)
          OR ($3::text IS NOT NULL AND upper(pan) = upper($3::text))`,
      [user.email, user.phone || '', user.pan]
    );
    const userDeleteResult = await client.query(
      'DELETE FROM public.users WHERE id = $1',
      [user.id]
    );
    if (userDeleteResult.rowCount !== 1) {
      throw new Error('Expected exactly one user row to be deleted; rolling back.');
    }

    await client.query('COMMIT');
    transactionStarted = false;
    process.stdout.write(
      `Deleted user: ${userDeleteResult.rowCount}; signup OTP rows: ${otpResult.rowCount}; PAN/KYC rows: ${kycResult.rowCount}.\n`
    );
    process.stdout.write(
      'Database records deleted. This does not delete any account or transaction held by NSE or another external service.\n'
    );
  } catch (error) {
    if (transactionStarted) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

try {
  await main();
} catch (error) {
  process.stderr.write(`User data deletion failed: ${error.message}\n`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
