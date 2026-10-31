# Dhanvo

Frontend and Node.js backend for the Dhanvo account-opening application.

## Frontend

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env.local` for frontend-only public configuration.
Do not put admin credentials in frontend environment files: all `VITE_*` values
are embedded in browser JavaScript.

## Backend

```sh
cd backend
npm install
npm run dev
```

Configure backend-only secrets in `backend/.env`. Never commit `.env` files.
The backend's database connection requires `DATABASE_URL`; customer JWT
authentication also uses the separate `JWT_SECRET`. The admin portal uses
server-enforced access at `/api/admin`. Copy `backend/.env.example` to
`backend/.env` and set the following admin-only values:

- `ADMIN_EMAIL`: the single permitted administrator email.
- `ADMIN_PASSWORD_HASH`: a bcrypt hash, not a plaintext password. Run
  `node scripts/hashAdminPassword.js` from `backend/` in an interactive terminal
  to enter a password without echo; use a password of 14–72 bytes.
- `ADMIN_JWT_SECRET`: a dedicated random secret of at least 32 bytes. Generate
  it locally with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
  and store it only in the backend secret store or ignored `backend/.env`.
Admin user APIs require a short-lived admin token and return only whitelisted
account fields. Unmasked PAN values, password hashes, OTP contents, raw NSE
responses, and financial balances are not included. The paginated
`GET /api/admin/users` endpoint accepts `filter=all|ucc-registered|ucc-unregistered|pan-verified|pan-unverified`;
the filter is applied before pagination and totals are calculated from the same
filtered set. `GET /api/admin/pan-checks` provides a separately paginated
verification history (`verified=all|true|false`); PAN, email, and phone are
masked server-side, and raw provider response JSON is never returned. PAN KYC
check totals count recorded checks, not unique users. NSE client codes are not
serialized to or displayed in the admin portal. The protected per-user activity endpoint looks
up the selected user's stored code server-side, never accepts one from the
browser, and only returns allowlisted NSE allotment fields. Never copy
production secrets into frontend env files or commit them. The Investments view
requires selecting an account and presents that account's allotment activity
for the selected date range; it is not a global activity feed, holdings
statement, or portfolio valuation.
The dashboard's Explore Mutual Funds screen also requires NSE MFSS API credentials
(`NSE_LOGIN_USER_ID`, `NSE_API_SECRET_USER`, `NSE_MEMBER_LICENSE_KEY`, and
`NSE_MEMBER_ID`) and an NSE-whitelisted server IP. Scheme and latest published
NAV downloads are cached for 15 minutes; mutual fund NAV is not intraday data.
Purchase orders additionally require the registered six-digit EUIN in the
backend-only `NSE_EUIN` setting and the verified distributor ARN in
`NSE_SUB_BROKER_ARN`; the server does not substitute a sample ARN. Orders are available only for active NSE UCCs
with verified PAN, submitted FATCA details, and eligible regular plans. UPI
orders require the investor's UPI ID (VPA) and NSE-verified bank details;
purchase orders use the physical/CDSL/NSDL mode reported by the NSE client
master. The NSE payment API returns an NSE-hosted `short_url`: desktop users
can scan it as a QR code, while mobile browsers navigate to the secure NSE page
for any supported handoff to an installed UPI app. The backend must have
`NSE_EUIN` set to the distributor's registered EUIN (`E` followed by six
digits); do not use a sample value. The backend loads `backend/.env` relative
to its own files, so the PM2 working directory does not affect env-file lookup.
The dashboard watchlist is saved per authenticated user and contains NSE MFSS
mutual-fund schemes saved from Explore. It shows each scheme's latest published
NSE NAV and NAV date; mutual-fund NAV is not an intraday quote.
The SIP, STP, and SWP screens read registration reports from NSE MFSS and provide
confirmed registration and cancellation flows. These flows require an active
NSE UCC, submitted FATCA details, an eligible scheme, and the backend EUIN and
distributor configuration. Allotment activity is read from the NSE MFSS
allotment statement report, one date range of up to 30 days at a time.
Allotments are transaction activity, not a consolidated holdings statement.
NSE MFSS does not provide the current total portfolio valuation used by the
dashboard; a CAS/RTA holdings source must be integrated before reporting
holdings value, invested amount, or returns.

To export a schema-only PostgreSQL SQL dump on the server, run
`node scripts/exportDatabaseSchema.js /tmp/dhanvo-schema.sql` from the
`backend/` directory. The script requires `pg_dump` to be installed, reads
`DATABASE_URL` from the backend environment, excludes table data, and refuses
to overwrite an existing output file. Copy the resulting file with `scp` and
remove the server-side copy after downloading it. Treat schema exports as
internal information and do not commit production dumps.

To export the complete PostgreSQL database, including table data, run
`node scripts/exportDatabaseDump.js /tmp/dhanvo-full-database.dump` from
`backend/`. The custom-format archive can be restored with `pg_restore`.
It may contain personal information and credential hashes; restrict access,
encrypt it for long-term storage, and delete temporary server copies after
download. The exporter refuses to overwrite an existing output file.

To remove one user's database records, first run
`node scripts/deleteUserData.js --dry-run user@example.com` from `backend/`
to preview matching row counts. Only after verifying the intended user and
counts, run `node scripts/deleteUserData.js --delete user@example.com`.
The deletion is transactional and removes the user row, matching signup OTP
rows, and matching PAN/KYC records. It does not delete data held by NSE or
other external services; production deletes should be preceded by a verified
database backup.
