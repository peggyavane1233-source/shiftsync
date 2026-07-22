-- Quick seed for Supabase SQL editor (after V1__schema.sql).
-- departments (id, site_id, name) + certifications (id, site_id, name, description, expiry_days)

INSERT INTO sites (id, name) VALUES
('a0000000-0000-4000-8000-000000000001', 'Obuasi Mine')
ON CONFLICT (id) DO NOTHING;

INSERT INTO departments (id, site_id, name) VALUES
('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Underground Zone 1'),
('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Underground Zone 2'),
('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Surface Processing')
ON CONFLICT (id) DO NOTHING;

INSERT INTO certifications (id, site_id, name, description, expiry_days) VALUES
('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Underground Blasting', 'Blasting operations safety', 365),
('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'First Aid L2', 'Basic life support', 730)
ON CONFLICT (id) DO NOTHING;
