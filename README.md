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

1. Create a Supabase project and enable **Confirm Email** under Authentication →
   Sign In / Providers → Email.
2. Set the Supabase Site URL to `https://eventfulapp-api.vercel.app` and add both
   `https://eventfulapp-api.vercel.app/verify-email` and
   `http://localhost:5173/verify-email` to Redirect URLs.
3. Configure custom SMTP with Resend for production confirmation emails. The
   Supabase development sender is intentionally limited.
4. Following Supabase's Prisma guide, create a dedicated Prisma database role in
   the SQL editor (replace the password):

   ```sql
   create user "prisma" with password 'GENERATE_A_STRONG_PASSWORD' bypassrls createdb;
   grant "prisma" to "postgres";
   grant usage, create on schema public to "prisma";
   grant all on all tables in schema public to "prisma";
   grant all on all sequences in schema public to "prisma";
   alter default privileges in schema public grant all on tables to "prisma";
   alter default privileges in schema public grant all on sequences to "prisma";
   ```

5. Copy `.env.example` to `.env` and use the Supavisor session-pooler URL (port
   5432) for `DATABASE_URL`. Do not use transaction mode for migrations.
6. Apply and generate the database client:

   ```bash
   npm install
   npm run db:migrate
   npm run db:generate
   ```

The migration enables RLS on every public table and revokes browser roles. This
API uses a dedicated server-only Prisma role and performs authorization in the
service layer. Never expose that database URL or a Supabase secret/service-role
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
