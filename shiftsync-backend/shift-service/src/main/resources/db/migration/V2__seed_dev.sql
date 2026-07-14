-- V2__seed_dev.sql

-- Departments
INSERT INTO departments (id, name, mine_zone) VALUES 
('dept-0000-0000-0000-000000000001', 'Underground Zone 1', 'UG-Z1'),
('dept-0000-0000-0000-000000000002', 'Underground Zone 2', 'UG-Z2'),
('dept-0000-0000-0000-000000000003', 'Surface Processing', 'SURF');

-- Supervisors
INSERT INTO users (id, email, password_hash, display_name, role, department_id, employee_no) VALUES 
('usr-sup-0000-0000-0000-000000000001', 'kwame@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Kwame Mensah', 'SUPERVISOR', 'dept-0000-0000-0000-000000000001', 'SUP-100'),
('usr-sup-0000-0000-0000-000000000002', 'akua@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Akua Osei', 'SUPERVISOR', 'dept-0000-0000-0000-000000000002', 'SUP-101'),
('usr-sup-0000-0000-0000-000000000003', 'yaw@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Yaw Appiah', 'SUPERVISOR', 'dept-0000-0000-0000-000000000003', 'SUP-102');

-- Update departments with supervisor_id
UPDATE departments SET supervisor_id = 'usr-sup-0000-0000-0000-000000000001' WHERE id = 'dept-0000-0000-0000-000000000001';
UPDATE departments SET supervisor_id = 'usr-sup-0000-0000-0000-000000000002' WHERE id = 'dept-0000-0000-0000-000000000002';
UPDATE departments SET supervisor_id = 'usr-sup-0000-0000-0000-000000000003' WHERE id = 'dept-0000-0000-0000-000000000003';

-- Admin & Safety
INSERT INTO users (id, email, password_hash, display_name, role, employee_no) VALUES 
('usr-adm-0000-0000-0000-000000000001', 'admin@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Afiya Baah', 'ADMIN', 'ADM-001'),
('usr-saf-0000-0000-0000-000000000001', 'safety@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Kofi Owusu', 'SAFETY', 'SAF-001');

-- Workers
INSERT INTO users (id, email, password_hash, display_name, role, department_id, employee_no) VALUES 
('usr-wrk-0000-0000-0000-000000000001', 'ama.boateng@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Ama Boateng', 'WORKER', 'dept-0000-0000-0000-000000000002', 'WRK-1000'),
('usr-wrk-0000-0000-0000-000000000002', 'kwadwo.asare@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Kwadwo Asare', 'WORKER', 'dept-0000-0000-0000-000000000003', 'WRK-1001'),
('usr-wrk-0000-0000-0000-000000000003', 'abena.pokua@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Abena Pokua', 'WORKER', 'dept-0000-0000-0000-000000000001', 'WRK-1002'),
('usr-wrk-0000-0000-0000-000000000004', 'kwabena.frimpong@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Kwabena Frimpong', 'WORKER', 'dept-0000-0000-0000-000000000002', 'WRK-1003'),
('usr-wrk-0000-0000-0000-000000000005', 'yaa.asantewaa@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Yaa Asantewaa', 'WORKER', 'dept-0000-0000-0000-000000000003', 'WRK-1004');

-- Shifts and Assignments for today
INSERT INTO shifts (id, department_id, start_time, end_time, shift_type, required_workers, status, created_by, published_at) VALUES 
('shf-0000-0000-0000-000000000001', 'dept-0000-0000-0000-000000000001', CURRENT_DATE + interval '6 hours', CURRENT_DATE + interval '18 hours', 'DAY', 5, 'PUBLISHED', 'usr-sup-0000-0000-0000-000000000001', CURRENT_TIMESTAMP);

INSERT INTO shift_assignments (id, shift_id, user_id, status) VALUES 
('asn-0000-0000-0000-000000000001', 'shf-0000-0000-0000-000000000001', 'usr-wrk-0000-0000-0000-000000000003', 'CONFIRMED');

-- Fatigue Scores
INSERT INTO fatigue_scores (id, user_id, calculated_at, hours_worked_24h, hours_worked_7d, night_shifts_7d, consecutive_days, score, risk_level, model_version) VALUES 
('fat-0000-0000-0000-000000000001', 'usr-wrk-0000-0000-0000-000000000001', CURRENT_TIMESTAMP, 12, 72, 4, 7, 85, 'CRITICAL', 'FAID-mock-v1'),
('fat-0000-0000-0000-000000000002', 'usr-wrk-0000-0000-0000-000000000002', CURRENT_TIMESTAMP, 12, 72, 4, 7, 85, 'CRITICAL', 'FAID-mock-v1'),
('fat-0000-0000-0000-000000000003', 'usr-wrk-0000-0000-0000-000000000003', CURRENT_TIMESTAMP, 8, 40, 0, 3, 65, 'WARNING', 'FAID-mock-v1');
