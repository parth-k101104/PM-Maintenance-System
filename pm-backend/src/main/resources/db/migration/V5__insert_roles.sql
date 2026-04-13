INSERT INTO access_permissions (access_level_id, level_name, permissions, created_at) VALUES 
(1, 'Operator', '{"reports":["view"], "maintenance":["report_issue", "update_readings", "execute_tasks"], "inventory":["consume_spares"]}', '2026-01-01 9:00:00'),
(2, 'Supervisor', '{"reports":["view"], "maintenance":["assign_tasks","update_status","execute_tasks"], "inventory":["add_spares","update_stock","view_stock"]}', '2026-01-01 9:00:00'),
(3, 'Line Manager', '{"reports":["view"], "maintenance":["create_schedule","approve_execution","assign_tasks","update_status","analyze_readings"]}', '2026-01-01 9:00:00'),
(4, 'Maintenance Manager', '{"system":"full", "reports":"full", "maintenance":"full","inventory":"full","users":"manage"}', '2026-01-01 9:00:00');

INSERT INTO roles (role_id, name, access_level_id, created_at) VALUES 
('1', 'Maintenance Manager', 4, '2026-01-01 9:00:00'),
('2', 'Line Manager', 3, '2026-01-01 9:00:00'),
('3', 'Line Supervisor', 2, '2026-01-01 9:00:00'),
('4', 'Electrician', 1, '2026-01-01 9:00:00'),
('5', 'Fitter', 1, '2026-01-01 9:00:00'),
('6', 'Maintenance Engineer', 3, '2026-01-01 9:00:00'),
('7', 'Production Operator', 1, '2026-01-01 9:00:00'),
('8', 'Store Incharge', 2, '2026-01-01 9:00:00'),
('9', 'Quality Engineer', 2, '2026-01-01 9:00:00'),
('10', 'HSE Officer', 2, '2026-01-01 9:00:00'),
('11', 'Plant Admin', 4, '2026-01-01 9:00:00');
