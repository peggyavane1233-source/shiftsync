-- V1__init.sql

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE user_role AS ENUM ('WORKER','SUPERVISOR','SAFETY','ADMIN');

CREATE TABLE users (
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

CREATE TABLE refresh_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash      TEXT NOT NULL, -- Hashed token to prevent theft
  family_id       UUID NOT NULL, -- Groups tokens from the same original login
  expires_at      TIMESTAMPTZ NOT NULL,
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at      TIMESTAMPTZ,   -- If set, this token was revoked
  replaced_by     UUID           -- Points to the new token in the chain
);
CREATE INDEX idx_refresh_tokens_family ON refresh_tokens (family_id);

CREATE TABLE login_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address      VARCHAR(45) NOT NULL,
  email           CITEXT NOT NULL,
  success         BOOLEAN NOT NULL,
  attempted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_login_attempts_ip_time ON login_attempts (ip_address, attempted_at);
