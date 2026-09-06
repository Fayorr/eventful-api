# Eventful API V2

Eventful V2 is a TypeScript/Express ticketing API backed by Supabase Postgres and
Supabase Auth. It supports creator and eventee roles, confirmed-email login,
Paystack checkout, one-time QR admission, reminders, Redis caching, creator
payment ledgers, and event analytics.

- Production frontend: <https://eventfulapp-api.vercel.app>
- Production backend: <https://eventful-api.hostless.app>
- Production API base URL: <https://eventful-api.hostless.app/api/v2>
- Production Swagger UI: <https://eventful-api.hostless.app/api-docs>

## Why Supabase rather than Neon?

Both provide excellent managed PostgreSQL. Neon is especially strong when a team
needs database branches for every preview environment. Eventful benefits more from
Supabase because the same project provides PostgreSQL plus confirmed-email auth,
JWT lifecycle management, dashboard tooling, and a clean path to Storage or
Realtime later. The application still uses ordinary PostgreSQL through Prisma, so
the business data is portable.

## Stack

- Node.js, Express, and TypeScript
- Supabase Postgres and Supabase Auth
- Prisma ORM with committed SQL migrations
- Redis for list caching, distributed rate limits, and BullMQ reminders
- Paystack payments, Resend email, Cloudinary QR images
- Jest unit tests and OpenAPI/Swagger docs

## Supabase setup

The hosted `eventful` project is provisioned in Fayo's Supabase team at
`https://pqxaxfrlffldahvxlvov.supabase.co`. Its V2 schema, indexes, RLS, and
least-privilege API role have already been applied.

1. Keep **Confirm Email** enabled under Authentication → Sign In / Providers →
   Email. The API also refuses login until Supabase reports the address as
   confirmed.
2. Set the Supabase Site URL to `https://eventfulapp-api.vercel.app` and add both
   `https://eventfulapp-api.vercel.app/verify-email` and
   `http://localhost:5173/verify-email` to Redirect URLs.
3. Configure custom SMTP with Resend for production confirmation emails. The
   Supabase development sender is intentionally limited.
4. Copy `.env.example` to `.env` and use the server-only `eventful_api` role with
   the Supavisor session-pooler URL (port 5432) for `DATABASE_URL`.
5. Install dependencies and generate the Prisma client:

   ```bash
   npm install
   npm run db:generate
   npm run db:validate
   ```

Schema changes are applied with Supabase migration tooling using an administrative
connection; the matching SQL is kept in `prisma/migrations` for review and source
control. Do not run migrations with `DATABASE_URL`: the runtime role deliberately
has only CRUD access and cannot create or alter database objects.

Every public table has RLS enabled and browser-role grants are revoked. The API
uses the dedicated server-only role and performs authorization in the service
layer. Never expose `DATABASE_URL`, its password, or a Supabase secret/service-role
key to the web app.

## Run locally

```bash
docker compose up -d
npm run dev
```

Run the reminder worker in a second terminal:

```bash
npm run worker:dev
```

Swagger UI is at `http://localhost:5001/api-docs`; health is at `/health`, and V2
routes are under `/api/v2`.

For local frontend callbacks, override `FRONTEND_URL=http://localhost:5173` in
your local `.env`. Production defaults to `https://eventfulapp-api.vercel.app`.

## Quality checks

```bash
npm run build
npm test
```

Money is persisted as integer kobo. Ticket issuance uses serializable PostgreSQL
transactions and constrained inventory updates. QR codes carry random tokens;
only SHA-256 hashes are stored, and scans are atomically single-use.
