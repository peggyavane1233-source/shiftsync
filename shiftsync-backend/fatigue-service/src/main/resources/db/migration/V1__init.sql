-- V1__init.sql for fatigue-service

DO $$ BEGIN
    CREATE TYPE risk_level AS ENUM ('LOW','ADVISORY','WARNING','CRITICAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS fatigue_scores (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL,
    calculated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    hours_worked_24h  NUMERIC(4,1) NOT NULL,
    hours_worked_7d   NUMERIC(5,1) NOT NULL,
    night_shifts_7d   INT NOT NULL,
    consecutive_days  INT NOT NULL,
    self_report_score INT,
    score             INT NOT NULL CHECK (score BETWEEN 0 AND 100),
    risk_level        risk_level NOT NULL,
    model_version     VARCHAR(20) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fatigue_user_time ON fatigue_scores (user_id, calculated_at DESC);

CREATE TABLE IF NOT EXISTS fatigue_alerts (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL,
    score_id         UUID NOT NULL REFERENCES fatigue_scores(id),
    alert_level      risk_level NOT NULL,
    triggered_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    acknowledged_by  UUID,
    acknowledged_at  TIMESTAMPTZ,
    override_reason  TEXT,
    resolved_at      TIMESTAMPTZ,
    CHECK (acknowledged_by IS NULL OR acknowledged_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS fatigue_self_reports (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,
    shift_id    UUID,
    sleep_hours NUMERIC(3,1),
    alertness   INT CHECK (alertness BETWEEN 1 AND 5),
    reported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
