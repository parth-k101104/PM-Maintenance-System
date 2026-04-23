-- =============================================================================
-- V22: FIX SUPERVISOR APPROVAL DATES AND ADD HISTORICAL DATA
-- =============================================================================

-- 1. Fix approval due dates for supervisor 214
-- Set 'today' (2026-02-01) for a few tasks so they appear in Today's Approvals (including one with deviation 130017)
UPDATE pm_schedule_approval
SET approval_due_date = '2026-02-01'
WHERE approver_id = '214' 
  AND approval_level = 1 
  AND schedule_execution_id IN ('130017', '130023', '130025', '130105');

-- Set 'later this month' for other pending approvals so they appear as upcoming
UPDATE pm_schedule_approval
SET approval_due_date = '2026-02-05'
WHERE approver_id = '214' 
  AND approval_level = 1 
  AND approval_status = 'APPROVAL_REQUESTED'
  AND schedule_execution_id NOT IN ('130017', '130023', '130025', '130105');

-- 2. Insert historical executions for tasks that are currently under review
-- This populates the historical data API endpoint (max 5 past executions)

-- std_task 71018 (Measure voltage drop, HIGH criticality) -> task_schedule_id 90018
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('110018', '90018', '208', '2025-12-01 08:00:00', '2025-12-01', 'APPROVED', '2025-12-01 10:00:00', '18', '23.5', FALSE, 'Voltage within normal range (Tol: 22-26)');

INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('120018', '90018', '208', '2026-01-01 08:00:00', '2026-01-01', 'APPROVED', '2026-01-01 10:30:00', '20', '22.1', FALSE, 'Voltage close to minimum tolerance');

-- std_task 71023 (Clean cooling fan, LOW criticality) -> task_schedule_id 90023
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('110023', '90023', '208', '2025-12-01 08:00:00', '2025-12-01', 'APPROVED', '2025-12-01 09:00:00', '15', NULL, FALSE, 'Cleaned thoroughly');

INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('120023', '90023', '208', '2026-01-01 08:00:00', '2026-01-01', 'APPROVED', '2026-01-01 09:15:00', '14', NULL, FALSE, 'Normal cleaning performed');

-- std_task 71025 (Check for clogging, MEDIUM criticality) -> task_schedule_id 90025
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('110025', '90025', '205', '2025-12-01 08:00:00', '2025-12-01', 'APPROVED', '2025-12-01 11:00:00', '10', NULL, FALSE, 'No clogging detected');

INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('120025', '90025', '205', '2026-01-01 08:00:00', '2026-01-01', 'APPROVED', '2026-01-01 11:10:00', '12', NULL, FALSE, 'Minor debris cleared');

-- std_task 71026 (Clean inner surfaces) -> task_schedule_id 90026
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('110026', '90026', '207', '2025-12-01 08:00:00', '2025-12-01', 'APPROVED', '2025-12-01 08:30:00', '25', NULL, FALSE, 'Heavy dirt accumulation removed');

INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('120026', '90026', '207', '2026-01-01 08:00:00', '2026-01-01', 'APPROVED', '2026-01-01 08:45:00', '28', NULL, FALSE, 'Cleaned as per SOP');

-- std_task 71027 (Check seal condition) -> task_schedule_id 90027
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('110027', '90027', '210', '2025-12-01 08:00:00', '2025-12-01', 'APPROVED', '2025-12-01 09:20:00', '10', NULL, FALSE, 'Seal in good condition');

INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('120027', '90027', '210', '2026-01-01 08:00:00', '2026-01-01', 'APPROVED', '2026-01-01 09:30:00', '12', NULL, FALSE, 'Minor wear but still acceptable');

-- std_task 71029 (Check water flow) -> task_schedule_id 90029
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('110029', '90029', '205', '2025-12-01 08:00:00', '2025-12-01', 'APPROVED', '2025-12-01 10:15:00', '18', '95', FALSE, 'Flow is excellent');

INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('120029', '90029', '205', '2026-01-01 08:00:00', '2026-01-01', 'APPROVED', '2026-01-01 10:20:00', '15', '96', FALSE, 'Flow within specification');
