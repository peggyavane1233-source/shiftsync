-- V3__add_outbox_and_templates.sql

-- Transactional Outbox for events
CREATE TABLE outbox_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id  UUID NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    event_type    VARCHAR(100) NOT NULL,
    payload       JSONB NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at  TIMESTAMPTZ
);
CREATE INDEX idx_outbox_status ON outbox_events (status);

-- Shift Templates for recurring patterns
CREATE TABLE shift_templates (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL,
    name          VARCHAR(120) NOT NULL,
    start_time    TIME NOT NULL,
    duration_hrs  INT NOT NULL,
    required_cert_id UUID,
    required_role VARCHAR(40),
    headcount     INT NOT NULL DEFAULT 1,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Note: The shifts and shift_assignments tables were already created in V1__init.sql.
-- Let's ensure the status columns and constraints match the Phase B3 enums if not already.
