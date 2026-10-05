# Dhanvo

Frontend and Node.js backend for the Dhanvo account-opening application.

## Frontend

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and configure the local admin demo values if needed.

> `VITE_*` values are embedded in browser JavaScript at build time. They are not
> suitable for protecting production admin access; use server-side authentication
> before using the admin portal with real accounts.

## Backend

```sh
cd backend
npm install
npm run dev
```

Configure backend-only secrets in `backend/.env`. Never commit `.env` files.
