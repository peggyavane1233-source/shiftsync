-- V1__init.sql (no PostGIS — underground live GIS disabled)
-- Shared Supabase-safe: IF NOT EXISTS / duplicate guards

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS sites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prefer shared `users` table when present; otherwise local profiles mirror.
CREATE TABLE IF NOT EXISTS user_profiles (
  id              UUID PRIMARY KEY,
  display_name    VARCHAR(120) NOT NULL,
  phone           VARCHAR(20),
  role            VARCHAR(20) NOT NULL,
  department_id   UUID,
  employee_no     VARCHAR(40) UNIQUE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       UUID NOT NULL REFERENCES sites(id),
  name          VARCHAR(120) NOT NULL,
  mine_zone     VARCHAR(80),
  supervisor_id UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE user_profiles ADD CONSTRAINT fk_department FOREIGN KEY (department_id) REFERENCES departments(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS certifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id      UUID NOT NULL REFERENCES sites(id),
  name         VARCHAR(120) NOT NULL,
  description  TEXT,
  expiry_days  INT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_certifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  cert_id    UUID NOT NULL REFERENCES certifications(id),
  issued_at  DATE NOT NULL,
  expires_at DATE NOT NULL,
  is_active  BOOLEAN GENERATED ALWAYS AS (expires_at >= CURRENT_DATE) STORED,
  UNIQUE (user_id, cert_id)
);

CREATE TABLE IF NOT EXISTS user_devices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  device_id     VARCHAR(255) NOT NULL,
  push_token    VARCHAR(255),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_active_device ON user_devices (user_id) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    UUID,
  action      VARCHAR(80) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id   UUID,
  before      JSONB,
  after       JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
