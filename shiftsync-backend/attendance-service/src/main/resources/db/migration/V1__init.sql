-- V1__init.sql for attendance-service (no PostGIS — underground live GIS disabled)

DO $$ BEGIN
    CREATE TYPE attend_method AS ENUM ('QR','GPS','MANUAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS attendance_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  shift_id        UUID NOT NULL,
  method          attend_method NOT NULL,
  check_in_time   TIMESTAMPTZ,
  check_out_time  TIMESTAMPTZ,
  check_in_lat    DOUBLE PRECISION,
  check_in_lng    DOUBLE PRECISION,
  check_out_lat   DOUBLE PRECISION,
  check_out_lng   DOUBLE PRECISION,
  device_id       VARCHAR(120),
  captured_at     TIMESTAMPTZ NOT NULL,
  synced_at       TIMESTAMPTZ,
  is_offline_sync BOOLEAN NOT NULL DEFAULT FALSE,
  requires_review BOOLEAN NOT NULL DEFAULT FALSE,
  client_uuid     UUID NOT NULL,
  UNIQUE (client_uuid),
  UNIQUE (user_id, shift_id)
);

CREATE TABLE IF NOT EXISTS outbox_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id  UUID NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    event_type    VARCHAR(100) NOT NULL,
    payload       JSONB NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_attendance_outbox_status ON outbox_events (status);
