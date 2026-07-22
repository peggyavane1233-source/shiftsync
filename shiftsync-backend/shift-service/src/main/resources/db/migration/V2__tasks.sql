CREATE TABLE IF NOT EXISTS tasks (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title              VARCHAR(200) NOT NULL,
  assigned_user_id   UUID NOT NULL,
  assigned_by_user_id UUID NOT NULL,
  status             VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_user ON tasks (assigned_user_id, status);
