import { chmodSync, closeSync, existsSync, mkdtempSync, openSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import dotenv from 'dotenv';

dotenv.config();

function escapePgPassField(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/:/g, '\\:');
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  fail('DATABASE_URL is not set. Run this script from the backend directory.');
} else {
  let connection;
  try {
    connection = new URL(databaseUrl);
  } catch {
    fail('DATABASE_URL is not a valid PostgreSQL connection URL.');
  }

  if (connection) {
    if (!['postgres:', 'postgresql:'].includes(connection.protocol)) {
      fail('DATABASE_URL must use the postgres or postgresql scheme.');
    } else {
      const database = decodeURIComponent(connection.pathname.replace(/^\//, ''));
      if (!connection.hostname || !database) {
        fail('DATABASE_URL must include a database host and database name.');
      } else {
        const outputPath = resolve(process.argv[2] || 'dhanvo-full-database.dump');
        let outputFd;
        let temporaryDirectory;
        let outputCreated = false;

        try {
          if (existsSync(outputPath)) {
            throw new Error(`Output file already exists; refusing to overwrite: ${outputPath}`);
          }

          temporaryDirectory = mkdtempSync(resolve(tmpdir(), 'dhanvo-pgpass-'));
          const passFile = resolve(temporaryDirectory, 'pgpass');
          const passLine = [
            connection.hostname,
            connection.port || '5432',
            database,
            decodeURIComponent(connection.username),
            decodeURIComponent(connection.password),
          ].map(escapePgPassField).join(':');
          writeFileSync(passFile, `${passLine}\n`, { mode: 0o600 });
          chmodSync(passFile, 0o600);

          const env = { ...process.env, PGPASSFILE: passFile };
          for (const [urlName, envName] of [
            ['sslmode', 'PGSSLMODE'],
            ['sslrootcert', 'PGSSLROOTCERT'],
            ['sslcert', 'PGSSLCERT'],
            ['sslkey', 'PGSSLKEY'],
          ]) {
            if (connection.searchParams.has(urlName)) {
              env[envName] = connection.searchParams.get(urlName);
            }
          }

          outputFd = openSync(outputPath, 'wx', 0o600);
          closeSync(outputFd);
          outputFd = undefined;
          outputCreated = true;

          const result = spawnSync('pg_dump', [
            '--format=custom',
            '--no-owner',
            '--no-privileges',
            '--host', connection.hostname,
            '--port', connection.port || '5432',
            '--username', decodeURIComponent(connection.username),
            '--dbname', database,
            '--file', outputPath,
          ], { env, stdio: 'inherit' });

          if (result.error) throw result.error;
          if (result.status !== 0) {
            throw new Error(`pg_dump exited with status ${result.status ?? 'unknown'}.`);
          }
          process.stdout.write(`Full database dump (schema and data) saved to ${outputPath}\n`);
        } catch (error) {
          if (outputFd !== undefined) closeSync(outputFd);
          if (outputCreated) unlinkSync(outputPath);
          fail(`Full database export failed: ${error.message}`);
        } finally {
          if (temporaryDirectory) rmSync(temporaryDirectory, { recursive: true, force: true });
        }
      }
    }
  }
}
