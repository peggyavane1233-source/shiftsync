-- V2__seed_dev.sql

-- Match the seed data from shift-service so they share the exact same IDs
INSERT INTO users (id, email, password_hash, display_name, role, department_id, employee_no) VALUES 
('usr-sup-0000-0000-0000-000000000001', 'kwame@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Kwame Mensah', 'SUPERVISOR', 'dept-0000-0000-0000-000000000001', 'SUP-100'),
('usr-sup-0000-0000-0000-000000000002', 'akua@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Akua Osei', 'SUPERVISOR', 'dept-0000-0000-0000-000000000002', 'SUP-101'),
('usr-sup-0000-0000-0000-000000000003', 'yaw@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Yaw Appiah', 'SUPERVISOR', 'dept-0000-0000-0000-000000000003', 'SUP-102'),
('usr-adm-0000-0000-0000-000000000001', 'admin@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Afiya Baah', 'ADMIN', NULL, 'ADM-001'),
('usr-saf-0000-0000-0000-000000000001', 'safety@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Kofi Owusu', 'SAFETY', NULL, 'SAF-001'),
('usr-wrk-0000-0000-0000-000000000001', 'ama.boateng@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Ama Boateng', 'WORKER', 'dept-0000-0000-0000-000000000002', 'WRK-1000'),
('usr-wrk-0000-0000-0000-000000000002', 'kwadwo.asare@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Kwadwo Asare', 'WORKER', 'dept-0000-0000-0000-000000000003', 'WRK-1001'),
('usr-wrk-0000-0000-0000-000000000003', 'abena.pokua@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Abena Pokua', 'WORKER', 'dept-0000-0000-0000-000000000001', 'WRK-1002'),
('usr-wrk-0000-0000-0000-000000000004', 'kwabena.frimpong@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Kwabena Frimpong', 'WORKER', 'dept-0000-0000-0000-000000000002', 'WRK-1003'),
('usr-wrk-0000-0000-0000-000000000005', 'yaa.asantewaa@shiftsync.io', '$2a$12$R.OqMntV7gJg9cT6OSt4sO6hEwEw32hT3XzJ1VJw9Z7uO9P8r1DkK', 'Yaa Asantewaa', 'WORKER', 'dept-0000-0000-0000-000000000003', 'WRK-1004');
