-- V1__init.sql for emergency-service

DO $$ BEGIN
    CREATE TYPE muster_status AS ENUM ('ACTIVE', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE response_status AS ENUM ('UNACCOUNTED', 'PRESENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS emergency_musters (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone              UUID NOT NULL,
    initiated_by      UUID NOT NULL,
    initiated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at         TIMESTAMPTZ,
    status            muster_status NOT NULL DEFAULT 'ACTIVE',
    expected_workers  INT NOT NULL DEFAULT 0,
    accounted_workers INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_musters_zone_status ON emergency_musters (zone, status);

CREATE TABLE IF NOT EXISTS muster_responses (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    muster_id     UUID NOT NULL REFERENCES emergency_musters(id),
    user_id       UUID NOT NULL,
    status        response_status NOT NULL DEFAULT 'UNACCOUNTED',
    responded_at  TIMESTAMPTZ,
    marked_by     UUID,           -- If a supervisor manually marked them safe
    UNIQUE (muster_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_responses_muster ON muster_responses (muster_id);

CREATE TABLE IF NOT EXISTS outbox_events (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(255) NOT NULL,
    aggregate_id   UUID NOT NULL,
    event_type     VARCHAR(255) NOT NULL,
    payload        TEXT NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at   TIMESTAMPTZ
);
