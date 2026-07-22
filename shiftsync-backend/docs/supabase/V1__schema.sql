-- ShiftSync V1 schema for Supabase SQL editor
-- Safe to re-run: uses IF NOT EXISTS / duplicate_object guards.
-- No PostGIS (underground live GIS disabled).

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('WORKER','SUPERVISOR','SAFETY','ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE shift_type AS ENUM ('DAY','NIGHT','SWING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE shift_status AS ENUM ('DRAFT','PUBLISHED','CANCELLED','COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE assign_status AS ENUM
  ('ASSIGNED','CONFIRMED','SWAP_PENDING','SWAPPED','PRESENT','ABSENT','COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE attend_method AS ENUM ('QR','GPS','MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE risk_level AS ENUM ('LOW','ADVISORY','WARNING','CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE muster_status AS ENUM ('ACTIVE','CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE response_status AS ENUM ('UNACCOUNTED','PRESENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Auth / identity
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

-- Org
CREATE TABLE IF NOT EXISTS sites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       UUID NOT NULL REFERENCES sites(id),
  name          VARCHAR(120) NOT NULL,
  mine_zone     VARCHAR(80),
  supervisor_id UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id);
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
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cert_id    UUID NOT NULL REFERENCES certifications(id),
  issued_at  DATE NOT NULL,
  expires_at DATE NOT NULL,
  is_active  BOOLEAN GENERATED ALWAYS AS (expires_at >= CURRENT_DATE) STORED,
  UNIQUE (user_id, cert_id)
);

CREATE TABLE IF NOT EXISTS user_devices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id     VARCHAR(255) NOT NULL,
  push_token    VARCHAR(255),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_active_device ON user_devices (user_id) WHERE is_active = TRUE;

-- Scheduling
CREATE TABLE IF NOT EXISTS shifts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id    UUID NOT NULL REFERENCES departments(id),
  start_time       TIMESTAMPTZ NOT NULL,
  end_time         TIMESTAMPTZ NOT NULL,
  shift_type       shift_type NOT NULL,
  required_workers INT NOT NULL CHECK (required_workers > 0),
  required_cert_id UUID REFERENCES certifications(id),
  status           shift_status NOT NULL DEFAULT 'DRAFT',
  created_by       UUID NOT NULL REFERENCES users(id),
  published_at     TIMESTAMPTZ,
  CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS idx_shifts_dept_time ON shifts (department_id, start_time);

CREATE TABLE IF NOT EXISTS shift_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id      UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  status        assign_status NOT NULL DEFAULT 'ASSIGNED',
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at  TIMESTAMPTZ,
  UNIQUE (shift_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_assign_user ON shift_assignments (user_id);

CREATE TABLE IF NOT EXISTS shift_swap_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id   UUID NOT NULL REFERENCES users(id),
  target_user_id UUID NOT NULL REFERENCES users(id),
  shift_id       UUID NOT NULL REFERENCES shifts(id),
  status         VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  reason         TEXT,
  resolved_by    UUID REFERENCES users(id),
  resolved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               VARCHAR(200) NOT NULL,
  assigned_user_id    UUID NOT NULL,
  assigned_by_user_id UUID NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_user ON tasks (assigned_user_id, status);

CREATE TABLE IF NOT EXISTS shift_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id    UUID NOT NULL,
  name             VARCHAR(120) NOT NULL,
  start_time       TIME NOT NULL,
  duration_hrs     INT NOT NULL,
  required_cert_id UUID,
  required_role    VARCHAR(40),
  headcount        INT NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outbox_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id   UUID NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL,
  event_type     VARCHAR(100) NOT NULL,
  payload        JSONB NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox_events (status);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  shift_id        UUID NOT NULL REFERENCES shifts(id),
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
  UNIQUE (client_uuid)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_attend_user_shift ON attendance_records (user_id, shift_id);

CREATE TABLE IF NOT EXISTS qr_codes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id     UUID NOT NULL REFERENCES shifts(id),
  code_hash    TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE
);

-- Fatigue
CREATE TABLE IF NOT EXISTS fatigue_scores (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id),
  calculated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  hours_worked_24h   NUMERIC(4,1) NOT NULL,
  hours_worked_7d    NUMERIC(5,1) NOT NULL,
  night_shifts_7d    INT NOT NULL,
  consecutive_days   INT NOT NULL,
  self_report_score  INT,
  score              INT NOT NULL CHECK (score BETWEEN 0 AND 100),
  risk_level         risk_level NOT NULL,
  model_version      VARCHAR(20) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fatigue_user_time ON fatigue_scores (user_id, calculated_at DESC);

CREATE TABLE IF NOT EXISTS fatigue_alerts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id),
  score_id         UUID NOT NULL REFERENCES fatigue_scores(id),
  alert_level      risk_level NOT NULL,
  triggered_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_by  UUID REFERENCES users(id),
  acknowledged_at  TIMESTAMPTZ,
  override_reason  TEXT,
  resolved_at      TIMESTAMPTZ,
  CHECK (acknowledged_by IS NULL OR acknowledged_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS fatigue_self_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  shift_id    UUID REFERENCES shifts(id),
  sleep_hours NUMERIC(3,1),
  alertness   INT CHECK (alertness BETWEEN 1 AND 5),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications & emergency
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  type            VARCHAR(24) NOT NULL,
  channel         VARCHAR(8)  NOT NULL,
  title           VARCHAR(160) NOT NULL,
  message         TEXT NOT NULL,
  payload         JSONB,
  sent_at         TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  escalated_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_notif_unacked ON notifications (user_id) WHERE acknowledged_at IS NULL;

CREATE TABLE IF NOT EXISTS emergency_musters (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiated_by      UUID NOT NULL REFERENCES users(id),
  zone              VARCHAR(80) NOT NULL,
  initiated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at         TIMESTAMPTZ,
  closed_by         UUID REFERENCES users(id),
  status            muster_status NOT NULL DEFAULT 'ACTIVE',
  expected_workers  INT NOT NULL DEFAULT 0,
  accounted_workers INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS muster_responses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  muster_id    UUID NOT NULL REFERENCES emergency_musters(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id),
  status       response_status NOT NULL DEFAULT 'UNACCOUNTED',
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES users(id),
  marked_by    UUID,
  loc_lat      DOUBLE PRECISION,
  loc_lng      DOUBLE PRECISION,
  UNIQUE (muster_id, user_id)
);

-- Reporting
CREATE TABLE IF NOT EXISTS report_jobs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          VARCHAR(50) NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  parameters    TEXT,
  file_path     TEXT,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS reporting_fatigue_incidents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  employee_no     VARCHAR(50) NOT NULL,
  display_name    VARCHAR(100) NOT NULL,
  alert_time      TIMESTAMPTZ NOT NULL,
  overridden      BOOLEAN NOT NULL DEFAULT FALSE,
  overridden_by   UUID,
  override_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reporting_musters (
  id                             UUID PRIMARY KEY,
  zone                           UUID NOT NULL,
  initiated_at                   TIMESTAMPTZ NOT NULL,
  closed_at                      TIMESTAMPTZ,
  expected_workers               INT NOT NULL DEFAULT 0,
  accounted_workers              INT NOT NULL DEFAULT 0,
  time_to_full_headcount_seconds INT
);

CREATE TABLE IF NOT EXISTS reporting_muster_unaccounted (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  muster_id    UUID NOT NULL REFERENCES reporting_musters(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL,
  employee_no  VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL
);

-- Audit
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    UUID REFERENCES users(id),
  action      VARCHAR(80) NOT NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id   UUID,
  before      JSONB,
  after       JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
