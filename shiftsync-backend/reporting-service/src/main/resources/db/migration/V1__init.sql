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
