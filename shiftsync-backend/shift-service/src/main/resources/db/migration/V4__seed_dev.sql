-- V4__seed_dev.sql
-- Deterministic UUIDs valid for Postgres / Supabase.
-- Password for all users: password (BCrypt cost 12)

INSERT INTO sites (id, name) VALUES
('a0000000-0000-4000-8000-000000000001', 'Obuasi Mine')
ON CONFLICT (id) DO NOTHING;

-- departments (id, site_id, name)
INSERT INTO departments (id, site_id, name) VALUES
('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Underground Zone 1'),
('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Underground Zone 2'),
('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Surface Processing')
ON CONFLICT (id) DO NOTHING;

UPDATE departments SET mine_zone = 'UG-Z1' WHERE id = 'b0000000-0000-4000-8000-000000000001';
UPDATE departments SET mine_zone = 'UG-Z2' WHERE id = 'b0000000-0000-4000-8000-000000000002';
UPDATE departments SET mine_zone = 'SURF'  WHERE id = 'b0000000-0000-4000-8000-000000000003';

-- certifications (id, site_id, name, description, expiry_days)
INSERT INTO certifications (id, site_id, name, description, expiry_days) VALUES
('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Underground Blasting', 'Blasting operations safety', 365),
('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'First Aid L2', 'Basic life support', 730)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, password_hash, display_name, role, department_id, employee_no) VALUES
('d1000000-0000-4000-8000-000000000001', 'kwame@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Kwame Mensah', 'SUPERVISOR', 'b0000000-0000-4000-8000-000000000001', 'SUP-100'),
('d1000000-0000-4000-8000-000000000002', 'akua@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Akua Osei', 'SUPERVISOR', 'b0000000-0000-4000-8000-000000000002', 'SUP-101'),
('d1000000-0000-4000-8000-000000000003', 'yaw@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Yaw Appiah', 'SUPERVISOR', 'b0000000-0000-4000-8000-000000000003', 'SUP-102')
ON CONFLICT (id) DO NOTHING;

UPDATE departments SET supervisor_id = 'd1000000-0000-4000-8000-000000000001' WHERE id = 'b0000000-0000-4000-8000-000000000001';
UPDATE departments SET supervisor_id = 'd1000000-0000-4000-8000-000000000002' WHERE id = 'b0000000-0000-4000-8000-000000000002';
UPDATE departments SET supervisor_id = 'd1000000-0000-4000-8000-000000000003' WHERE id = 'b0000000-0000-4000-8000-000000000003';

INSERT INTO users (id, email, password_hash, display_name, role, employee_no) VALUES
('d2000000-0000-4000-8000-000000000001', 'admin@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Afiya Baah', 'ADMIN', 'ADM-001'),
('d3000000-0000-4000-8000-000000000001', 'safety@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Kofi Owusu', 'SAFETY', 'SAF-001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, password_hash, display_name, role, department_id, employee_no) VALUES
('d4000000-0000-4000-8000-000000000001', 'ama.boateng@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Ama Boateng', 'WORKER', 'b0000000-0000-4000-8000-000000000002', 'WRK-1000'),
('d4000000-0000-4000-8000-000000000002', 'kwadwo.asare@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Kwadwo Asare', 'WORKER', 'b0000000-0000-4000-8000-000000000003', 'WRK-1001'),
('d4000000-0000-4000-8000-000000000003', 'abena.pokua@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Abena Pokua', 'WORKER', 'b0000000-0000-4000-8000-000000000001', 'WRK-1002'),
('d4000000-0000-4000-8000-000000000004', 'kwabena.frimpong@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Kwabena Frimpong', 'WORKER', 'b0000000-0000-4000-8000-000000000002', 'WRK-1003'),
('d4000000-0000-4000-8000-000000000005', 'yaa.asantewaa@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Yaa Asantewaa', 'WORKER', 'b0000000-0000-4000-8000-000000000003', 'WRK-1004')
ON CONFLICT (id) DO NOTHING;

INSERT INTO shifts (id, department_id, start_time, end_time, shift_type, required_workers, status, created_by, published_at) VALUES
('e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', CURRENT_DATE + interval '6 hours', CURRENT_DATE + interval '18 hours', 'DAY', 5, 'PUBLISHED', 'd1000000-0000-4000-8000-000000000001', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO shift_assignments (id, shift_id, user_id, status) VALUES
('e1000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000003', 'CONFIRMED')
ON CONFLICT (id) DO NOTHING;

INSERT INTO fatigue_scores (id, user_id, calculated_at, hours_worked_24h, hours_worked_7d, night_shifts_7d, consecutive_days, score, risk_level, model_version) VALUES
('e2000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000001', CURRENT_TIMESTAMP, 12, 72, 4, 7, 85, 'CRITICAL', 'FAID-mock-v1'),
('e2000000-0000-4000-8000-000000000002', 'd4000000-0000-4000-8000-000000000002', CURRENT_TIMESTAMP, 12, 72, 4, 7, 85, 'CRITICAL', 'FAID-mock-v1'),
('e2000000-0000-4000-8000-000000000003', 'd4000000-0000-4000-8000-000000000003', CURRENT_TIMESTAMP, 8, 40, 0, 3, 65, 'WARNING', 'FAID-mock-v1')
ON CONFLICT (id) DO NOTHING;
