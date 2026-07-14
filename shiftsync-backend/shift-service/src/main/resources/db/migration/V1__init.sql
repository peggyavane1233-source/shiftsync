-- V1__init.sql

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS citext;

-- 6.1 Identity & Org
CREATE TYPE user_role AS ENUM ('WORKER','SUPERVISOR','SAFETY','ADMIN');

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           CITEXT UNIQUE NOT NULL,
  phone           VARCHAR(20) UNIQUE,           -- required: SMS fallback
  password_hash   TEXT NOT NULL,                -- BCrypt, cost 12
  display_name    VARCHAR(120) NOT NULL,
  role            user_role NOT NULL DEFAULT 'WORKER',
  department_id   UUID, -- References departments, will add constraint later to avoid circular
  employee_no     VARCHAR(40) UNIQUE NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE departments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(120) NOT NULL,
  mine_zone     VARCHAR(80)  NOT NULL,
  geofence      GEOGRAPHY(POLYGON, 4326),
  supervisor_id UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD CONSTRAINT fk_department FOREIGN KEY (department_id) REFERENCES departments(id);

CREATE TABLE certifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(120) NOT NULL,
  description  TEXT,
  expiry_days  INT NOT NULL
);

CREATE TABLE user_certifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cert_id    UUID NOT NULL REFERENCES certifications(id),
  issued_at  DATE NOT NULL,
  expires_at DATE NOT NULL,
  is_active  BOOLEAN GENERATED ALWAYS AS (expires_at >= CURRENT_DATE) STORED,
  UNIQUE (user_id, cert_id)
);

-- 6.2 Scheduling
CREATE TYPE shift_type   AS ENUM ('DAY','NIGHT','SWING');
CREATE TYPE shift_status AS ENUM ('DRAFT','PUBLISHED','CANCELLED','COMPLETED');
CREATE TYPE assign_status AS ENUM
  ('ASSIGNED','CONFIRMED','SWAP_PENDING','SWAPPED','PRESENT','ABSENT','COMPLETED');

CREATE TABLE shifts (
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
CREATE INDEX idx_shifts_dept_time ON shifts (department_id, start_time);

CREATE TABLE shift_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id      UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  status        assign_status NOT NULL DEFAULT 'ASSIGNED',
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at  TIMESTAMPTZ,
  UNIQUE (shift_id, user_id)
);
CREATE INDEX idx_assign_user ON shift_assignments (user_id);

CREATE TABLE shift_swap_requests (
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

-- 6.3 Attendance
CREATE TYPE attend_method AS ENUM ('QR','GPS','MANUAL');

CREATE TABLE attendance_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  shift_id        UUID NOT NULL REFERENCES shifts(id),
  method          attend_method NOT NULL,
  check_in_time   TIMESTAMPTZ,
  check_out_time  TIMESTAMPTZ,
  check_in_loc    GEOGRAPHY(POINT, 4326),
  check_out_loc   GEOGRAPHY(POINT, 4326),
  device_id       VARCHAR(120),
  captured_at     TIMESTAMPTZ NOT NULL,
  synced_at       TIMESTAMPTZ,
  is_offline_sync BOOLEAN NOT NULL DEFAULT FALSE,
  client_uuid     UUID NOT NULL,
  UNIQUE (client_uuid)
);
CREATE UNIQUE INDEX uq_attend_user_shift ON attendance_records (user_id, shift_id);

CREATE TABLE qr_codes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id     UUID NOT NULL REFERENCES shifts(id),
  code_hash    TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE
);

-- 6.4 Fatigue
CREATE TYPE risk_level AS ENUM ('LOW','ADVISORY','WARNING','CRITICAL');

CREATE TABLE fatigue_scores (
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
CREATE INDEX idx_fatigue_user_time ON fatigue_scores (user_id, calculated_at DESC);

CREATE TABLE fatigue_alerts (
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

CREATE TABLE fatigue_self_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  shift_id    UUID REFERENCES shifts(id),
  sleep_hours NUMERIC(3,1),
  alertness   INT CHECK (alertness BETWEEN 1 AND 5),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6.5 Notifications & Emergency
CREATE TABLE notifications (
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
CREATE INDEX idx_notif_unacked ON notifications (user_id) WHERE acknowledged_at IS NULL;

CREATE TABLE emergency_musters (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiated_by      UUID NOT NULL REFERENCES users(id),
  zone              VARCHAR(80) NOT NULL,
  initiated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at         TIMESTAMPTZ,
  closed_by         UUID REFERENCES users(id),
  expected_workers  INT NOT NULL,
  accounted_workers INT NOT NULL DEFAULT 0
);

CREATE TABLE muster_responses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  muster_id    UUID NOT NULL REFERENCES emergency_musters(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id),
  status       VARCHAR(16) NOT NULL DEFAULT 'UNACCOUNTED',
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES users(id),
  location     GEOGRAPHY(POINT, 4326),
  UNIQUE (muster_id, user_id)
);

-- 6.6 Audit
CREATE TABLE audit_log (
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
