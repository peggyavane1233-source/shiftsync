-- V1__init.sql — Supabase / shared DB safe

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('WORKER','SUPERVISOR','SAFETY','ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           CITEXT UNIQUE NOT NULL,
  phone           VARCHAR(20) UNIQUE,
  password_hash   TEXT NOT NULL,
  display_name    VARCHAR(120) NOT NULL,
  role            user_role NOT NULL DEFAULT 'WORKER',
  department_id   UUID,
  employee_no     VARCHAR(40) UNIQUE NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      TEXT NOT NULL,
  family_id       UUID NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at      TIMESTAMPTZ,
  replaced_by     UUID
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens (family_id);

CREATE TABLE IF NOT EXISTS login_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address      VARCHAR(45) NOT NULL,
  email           CITEXT NOT NULL,
  success         BOOLEAN NOT NULL,
  attempted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON login_attempts (ip_address, attempted_at);
