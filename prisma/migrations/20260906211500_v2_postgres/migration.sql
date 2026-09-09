CREATE TYPE "user_role" AS ENUM ('creator', 'eventee');
CREATE TYPE "payment_status" AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE "reminder_status" AS ENUM ('scheduled', 'sent', 'cancelled', 'failed');

CREATE TABLE "profiles" (
  "id" UUID PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "role" "user_role" NOT NULL DEFAULT 'eventee',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL
);

CREATE TABLE "events" (
  "id" UUID PRIMARY KEY,
  "title" VARCHAR(160) NOT NULL,
  "description" TEXT NOT NULL,
  "date" TIMESTAMPTZ NOT NULL,
  "location" VARCHAR(240) NOT NULL,
  "price_kobo" INTEGER NOT NULL DEFAULT 0 CHECK ("price_kobo" >= 0),
  "capacity" INTEGER NOT NULL CHECK ("capacity" > 0),
  "tickets_sold" INTEGER NOT NULL DEFAULT 0 CHECK ("tickets_sold" >= 0 AND "tickets_sold" <= "capacity"),
  "creator_id" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL
);

CREATE TABLE "payments" (
  "id" UUID PRIMARY KEY,
  "reference" VARCHAR(120) NOT NULL UNIQUE,
  "provider" VARCHAR(32) NOT NULL DEFAULT 'paystack',
  "status" "payment_status" NOT NULL DEFAULT 'pending',
  "amount_kobo" INTEGER NOT NULL CHECK ("amount_kobo" >= 0),
  "currency" CHAR(3) NOT NULL DEFAULT 'NGN',
  "event_id" UUID NOT NULL REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "eventee_id" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "paid_at" TIMESTAMPTZ,
  "provider_data" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL
);

CREATE TABLE "tickets" (
  "id" UUID PRIMARY KEY,
  "qr_token_hash" CHAR(64) NOT NULL UNIQUE,
  "qr_code_url" TEXT NOT NULL,
  "event_id" UUID NOT NULL REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "eventee_id" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "payment_id" UUID UNIQUE REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "scanned_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  UNIQUE ("event_id", "eventee_id")
);

CREATE TABLE "reminders" (
  "id" UUID PRIMARY KEY,
  "event_id" UUID NOT NULL REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "ticket_id" UUID REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "scheduled_for" TIMESTAMPTZ NOT NULL,
  "status" "reminder_status" NOT NULL DEFAULT 'scheduled',
  "job_id" TEXT UNIQUE,
  "sent_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  UNIQUE ("event_id", "user_id", "scheduled_for")
);

CREATE INDEX "events_date_idx" ON "events"("date");
CREATE INDEX "events_creator_id_date_idx" ON "events"("creator_id", "date");
CREATE INDEX "payments_event_id_status_idx" ON "payments"("event_id", "status");
CREATE INDEX "payments_eventee_id_created_at_idx" ON "payments"("eventee_id", "created_at");
CREATE INDEX "tickets_eventee_id_created_at_idx" ON "tickets"("eventee_id", "created_at");
CREATE INDEX "reminders_status_scheduled_for_idx" ON "reminders"("status", "scheduled_for");

-- Supabase Auth owns identities; the API owns application profiles.
-- This FK is intentionally added in SQL because Prisma only manages the public schema.
ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_auth_user_fk"
  FOREIGN KEY ("id") REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reminders" ENABLE ROW LEVEL SECURITY;

-- The Express API connects with a dedicated BYPASSRLS Prisma role. No browser role
-- receives table privileges; all authorization remains in the API service layer.
REVOKE ALL ON TABLE "profiles", "events", "payments", "tickets", "reminders" FROM anon, authenticated;
