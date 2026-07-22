-- V5__upgrade_site_id.sql
-- Re-runnable upgrades for DBs created before sites / site_id existed.
-- Mirrors docs/supabase/V1__schema.sql upgrade section.

CREATE TABLE IF NOT EXISTS sites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO sites (id, name) VALUES
('a0000000-0000-4000-8000-000000000001', 'Obuasi Mine')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE departments ADD COLUMN IF NOT EXISTS site_id UUID;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS mine_zone VARCHAR(80);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS supervisor_id UUID;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE departments
SET site_id = 'a0000000-0000-4000-8000-000000000001'
WHERE site_id IS NULL;

DO $$ BEGIN
  ALTER TABLE departments ALTER COLUMN site_id SET NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE departments
    ADD CONSTRAINT departments_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE certifications ADD COLUMN IF NOT EXISTS site_id UUID;
ALTER TABLE certifications ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE certifications ADD COLUMN IF NOT EXISTS expiry_days INT;

UPDATE certifications
SET site_id = 'a0000000-0000-4000-8000-000000000001'
WHERE site_id IS NULL;

UPDATE certifications
SET expiry_days = 365
WHERE expiry_days IS NULL;

DO $$ BEGIN
  ALTER TABLE certifications ALTER COLUMN site_id SET NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE certifications ALTER COLUMN expiry_days SET NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE certifications
    ADD CONSTRAINT certifications_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS requires_review BOOLEAN NOT NULL DEFAULT FALSE;
