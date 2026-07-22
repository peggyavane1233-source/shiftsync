-- V2__seed_dev.sql
-- Same deterministic UUIDs as docs/supabase/V2__seed_dev.sql
-- Password for all users: password (BCrypt cost 12)
-- Note: department rows must already exist (run shift-service seed / supabase V2 first on shared DB).

INSERT INTO users (id, email, password_hash, display_name, role, department_id, employee_no) VALUES
('d1000000-0000-4000-8000-000000000001', 'kwame@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Kwame Mensah', 'SUPERVISOR', 'b0000000-0000-4000-8000-000000000001', 'SUP-100'),
('d1000000-0000-4000-8000-000000000002', 'akua@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Akua Osei', 'SUPERVISOR', 'b0000000-0000-4000-8000-000000000002', 'SUP-101'),
('d1000000-0000-4000-8000-000000000003', 'yaw@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Yaw Appiah', 'SUPERVISOR', 'b0000000-0000-4000-8000-000000000003', 'SUP-102'),
('d2000000-0000-4000-8000-000000000001', 'admin@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Afiya Baah', 'ADMIN', NULL, 'ADM-001'),
('d3000000-0000-4000-8000-000000000001', 'safety@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Kofi Owusu', 'SAFETY', NULL, 'SAF-001'),
('d4000000-0000-4000-8000-000000000001', 'ama.boateng@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Ama Boateng', 'WORKER', 'b0000000-0000-4000-8000-000000000002', 'WRK-1000'),
('d4000000-0000-4000-8000-000000000002', 'kwadwo.asare@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Kwadwo Asare', 'WORKER', 'b0000000-0000-4000-8000-000000000003', 'WRK-1001'),
('d4000000-0000-4000-8000-000000000003', 'abena.pokua@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Abena Pokua', 'WORKER', 'b0000000-0000-4000-8000-000000000001', 'WRK-1002'),
('d4000000-0000-4000-8000-000000000004', 'kwabena.frimpong@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Kwabena Frimpong', 'WORKER', 'b0000000-0000-4000-8000-000000000002', 'WRK-1003'),
('d4000000-0000-4000-8000-000000000005', 'yaa.asantewaa@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Yaa Asantewaa', 'WORKER', 'b0000000-0000-4000-8000-000000000003', 'WRK-1004')
ON CONFLICT (id) DO NOTHING;
