-- V2__seed_dev.sql

-- Departments
INSERT INTO departments (id, name, mine_zone) VALUES 
('dept-0000-0000-0000-000000000001', 'Underground Zone 1', 'UG-Z1'),
('dept-0000-0000-0000-000000000002', 'Underground Zone 2', 'UG-Z2'),
('dept-0000-0000-0000-000000000003', 'Surface Processing', 'SURF');

-- Supervisors
INSERT INTO user_profiles (id, display_name, role, department_id, employee_no) VALUES 
('usr-sup-0000-0000-0000-000000000001', 'Kwame Mensah', 'SUPERVISOR', 'dept-0000-0000-0000-000000000001', 'SUP-100'),
('usr-sup-0000-0000-0000-000000000002', 'Akua Osei', 'SUPERVISOR', 'dept-0000-0000-0000-000000000002', 'SUP-101'),
('usr-sup-0000-0000-0000-000000000003', 'Yaw Appiah', 'SUPERVISOR', 'dept-0000-0000-0000-000000000003', 'SUP-102');

UPDATE departments SET supervisor_id = 'usr-sup-0000-0000-0000-000000000001' WHERE id = 'dept-0000-0000-0000-000000000001';
UPDATE departments SET supervisor_id = 'usr-sup-0000-0000-0000-000000000002' WHERE id = 'dept-0000-0000-0000-000000000002';
UPDATE departments SET supervisor_id = 'usr-sup-0000-0000-0000-000000000003' WHERE id = 'dept-0000-0000-0000-000000000003';

-- Admin & Safety
INSERT INTO user_profiles (id, display_name, role, employee_no) VALUES 
('usr-adm-0000-0000-0000-000000000001', 'Afiya Baah', 'ADMIN', 'ADM-001'),
('usr-saf-0000-0000-0000-000000000001', 'Kofi Owusu', 'SAFETY', 'SAF-001');

-- Workers
INSERT INTO user_profiles (id, display_name, role, department_id, employee_no) VALUES 
('usr-wrk-0000-0000-0000-000000000001', 'Ama Boateng', 'WORKER', 'dept-0000-0000-0000-000000000002', 'WRK-1000'),
('usr-wrk-0000-0000-0000-000000000002', 'Kwadwo Asare', 'WORKER', 'dept-0000-0000-0000-000000000003', 'WRK-1001'),
('usr-wrk-0000-0000-0000-000000000003', 'Abena Pokua', 'WORKER', 'dept-0000-0000-0000-000000000001', 'WRK-1002'),
('usr-wrk-0000-0000-0000-000000000004', 'Kwabena Frimpong', 'WORKER', 'dept-0000-0000-0000-000000000002', 'WRK-1003'),
('usr-wrk-0000-0000-0000-000000000005', 'Yaa Asantewaa', 'WORKER', 'dept-0000-0000-0000-000000000003', 'WRK-1004');

-- Certifications
INSERT INTO certifications (id, name, description, expiry_days) VALUES
('cert-0000-0000-0000-000000000001', 'Underground Blasting', 'Blasting operations safety', 365),
('cert-0000-0000-0000-000000000002', 'First Aid L2', 'Basic life support', 730);

INSERT INTO user_certifications (user_id, cert_id, issued_at, expires_at) VALUES
('usr-wrk-0000-0000-0000-000000000003', 'cert-0000-0000-0000-000000000001', CURRENT_DATE - interval '100 days', CURRENT_DATE + interval '265 days');
