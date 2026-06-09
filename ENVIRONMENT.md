# CompassionEdu Environment Variables

This project has two apps:

- `backend`: Node/Express API
- `frontend`: React app

Never commit real `.env` files. Use the `.env.example` files as templates.

## Backend Local

Create `backend/.env`:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/compassion_edu
JWT_SECRET=change-me-local-access-secret
JWT_REFRESH_SECRET=change-me-local-refresh-secret
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=30d
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
UPLOAD_DIR=uploads
MAX_PROFILE_PHOTO_SIZE_MB=10
MAX_CV_SIZE_MB=50
MAX_MEDIA_SIZE_MB=50
```

## Backend Production

Set these on Render or your backend host:

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | Yes | `production` | Enables production behavior. |
| `PORT` | Usually host-provided | `4000` | Render may set this automatically. |
| `DATABASE_URL` | Yes | `postgresql://...` | PostgreSQL connection string. Use SSL for hosted DBs when required. |
| `JWT_SECRET` | Yes | 64-char random hex | Access-token signing secret. |
| `JWT_REFRESH_SECRET` | Yes | different 64-char random hex | Refresh-token hashing secret. |
| `JWT_EXPIRES_IN` | Yes | `24h` | Access-token lifetime. |
| `REFRESH_TOKEN_EXPIRES_IN` | Yes | `30d` | Refresh-token lifetime. |
| `ALLOWED_ORIGINS` | Yes | `https://app.vercel.app` | Comma-separated frontend origins. |
| `UPLOAD_DIR` | No | `uploads` | Upload folder path. |
| `MAX_PROFILE_PHOTO_SIZE_MB` | No | `10` | Documented upload limit. |
| `MAX_CV_SIZE_MB` | No | `50` | Documented upload limit. |
| `MAX_MEDIA_SIZE_MB` | No | `200` | Documented upload limit. |

Generate strong secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run it twice: once for `JWT_SECRET`, once for `JWT_REFRESH_SECRET`.

## Frontend Local

Create `frontend/.env` only if you need to override defaults:

```env
# Optional. If unset in development, frontend uses /api through package.json proxy.
REACT_APP_API_URL=http://localhost:4000/api

# Optional. /dev/accounts is visible automatically in development.
REACT_APP_SHOW_DEV_ACCOUNTS=false
```

## Frontend Production

Set these on Vercel:

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `REACT_APP_API_URL` | Yes | `https://compassionedu-api.onrender.com/api` | Must include `/api`; no trailing slash. |
| `REACT_APP_SHOW_DEV_ACCOUNTS` | No | `false` | Keep false unless you intentionally expose demo credentials. |

## Local Startup Order

1. Create `backend/.env`.
2. Install backend dependencies and run migrations.
3. Seed demo users if needed.
4. Start the backend on port `4000`.
5. Start the frontend on port `3000`.

The frontend development proxy expects the backend at `http://localhost:4000`.
