-- =============================================================================
-- PM SCHEDULE EXECUTION SEED DATA
-- =============================================================================
-- Personas:
--   Emp 208 = Sunil Gupta  (Electrician, Shift A)  — primary test subject
--   Emp 209 = Manoj Verma  (Electrician, Shift B)
--   Emp 210 = Akshay Rao   (Fitter, Shift A)
--   Emp 211 = Imran Shaikh  (Fitter, Shift B)
--   Emp 205 = Prakash More  (Maintenance Engineer)
--   Emp 207 = Rohit Singh   (Maintenance Engineer)
--
-- Supervisor 214 = Deepak Shinde  (supervises 208, 209, 210, 211)
-- Line Manager 202 = Amit Sharma
-- Maint Manager 201 = Rajesh Patil
--
-- Approval Workflow by criticality:
--   HIGH   → Workflow 3 (Sup → LM → MM)
--   MEDIUM → Workflow 2 (Sup → LM)
--   LOW    → Workflow 1 (Sup only)
--
-- Task schedule → std task → criticality mapping used below:
--   90013 → 71013 → LOW    (sensor voltage, Electrician)
--   90017 → 71017 → HIGH   (contact wear, Electrician)
--   90018 → 71018 → HIGH   (voltage drop, Electrician)
--   90019 → 71019 → MEDIUM (cable insulation, Electrician)
--   90020 → 71020 → MEDIUM (replace cable, Electrician)
--   90021 → 71021 → HIGH   (fuse continuity, Electrician)
--   90022 → 71022 → HIGH   (replace fuse, Electrician)
--   90023 → 71023 → LOW    (clean fan, Electrician)
--   90024 → 71024 → LOW    (check fan rotation, Electrician)
--   90033 → 71033 → HIGH   (PLC LEDs, Electrician)
--   90034 → 71034 → HIGH   (PLC backup, Electrician)
--   90035 → 71035 → MEDIUM (I/O test, Electrician)
--   90036 → 71036 → MEDIUM (I/O replace, Electrician)
--   90037 → 71037 → MEDIUM (relay inspect, Electrician)
--   90038 → 71038 → MEDIUM (relay replace, Electrician)
-- =============================================================================


-- =============================================================================
-- JANUARY 2026 — BACKLOG TASKS (past-due, for backlog display testing)
-- =============================================================================

-- BACKLOG 1: Emp 208 — Sensor Voltage check (LOW, Wf1) — overdue Jan 18, never completed → ASSIGNED backlog
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130100', '90013', '208', '2026-01-18 08:00:00', '2026-01-18', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Backlog - not started');

-- BACKLOG 2: Emp 208 — Contact wear inspection (HIGH, Wf3) — overdue Jan 18, started but not completed → IN_PROGRESS backlog
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130101', '90017', '208', '2026-01-18 08:00:00', '2026-01-18', 'IN_PROGRESS', NULL, NULL, NULL, FALSE, 'Backlog - in progress');

-- BACKLOG 3: Emp 208 — PLC LED Status check (HIGH, Wf3) — overdue Jan 25, completed and rejected
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130102', '90033', '208', '2026-01-25 08:00:00', '2026-01-25', 'REJECTED', '2026-01-25 09:00:00', '14', NULL, TRUE, 'PLC fault found, improper procedure');

-- BACKLOG 4: Emp 208 — I/O Response Test (MEDIUM, Wf2) — Jan 25, fully approved
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130103', '90035', '208', '2026-01-25 08:00:00', '2026-01-25', 'APPROVED', '2026-01-25 10:00:00', '18', NULL, FALSE, 'I/O response nominal');

-- BACKLOG 5: Emp 209 — Fan check (LOW, Wf1) — Jan 25, overdue ASSIGNED
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130104', '90024', '209', '2026-01-25 08:00:00', '2026-01-25', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Backlog - not started');

-- BACKLOG 6: Emp 210 — Mounting bolts inspect (LOW, Wf1) — Jan 25, under supervisor review
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130105', '90007', '210', '2026-01-25 08:00:00', '2026-01-25', 'UNDER_SUPERVISOR_REVIEW', '2026-01-25 09:30:00', '10', NULL, FALSE, 'Backlog - awaiting supervisor');


-- =============================================================================
-- FEB 1, 2026 — MAIN TEST BATCH
-- =============================================================================

INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130001', '90001', '205', '2026-02-01 08:00:00', '2026-02-01', 'APPROVED', '2026-02-01 08:20:00', '15', '2.4', FALSE, 'Vibration normal');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130002', '90002', '210', '2026-02-01 08:00:00', '2026-02-01', 'APPROVED', '2026-02-01 09:00:00', '22', NULL, FALSE, 'Shaft OK');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130003', '90003', '207', '2026-02-01 08:00:00', '2026-02-01', 'APPROVED', '2026-02-01 08:15:00', '10', '63', FALSE, 'Temp stable');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130004', '90004', '211', '2026-02-01 08:00:00', '2026-02-01', 'APPROVED', '2026-02-01 09:00:00', '28', NULL, FALSE, 'Lubricated');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130005', '90005', '205', '2026-02-01 08:00:00', '2026-02-01', 'IN_PROGRESS', NULL, NULL, NULL, FALSE, 'Alignment checking');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130006', '90006', '210', '2026-02-01 08:00:00', '2026-02-01', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Annual planned');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130007', '90007', '211', '2026-02-01 08:00:00', '2026-02-01', 'APPROVED', '2026-02-01 08:30:00', '12', NULL, FALSE, 'Bolts tight');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130008', '90008', '210', '2026-02-01 08:00:00', '2026-02-01', 'APPROVED', '2026-02-01 09:30:00', '25', NULL, FALSE, 'Replaced bolts');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130009', '90009', '211', '2026-02-01 08:00:00', '2026-02-01', 'APPROVED', '2026-02-01 08:10:00', '10', NULL, FALSE, 'Belt OK');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130010', '90010', '210', '2026-02-01 08:00:00', '2026-02-01', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Yearly task');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130011', '90011', '211', '2026-02-01 08:00:00', '2026-02-01', 'APPROVED', '2026-02-01 08:15:00', '8', NULL, FALSE, 'Roller smooth');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130012', '90012', '210', '2026-02-01 08:00:00', '2026-02-01', 'APPROVED', '2026-02-01 08:40:00', '20', NULL, FALSE, 'Greased');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130014', '90014', '209', '2026-02-01 08:00:00', '2026-02-01', 'IN_PROGRESS', NULL, NULL, NULL, FALSE, 'Cleaning');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130015', '90015', '210', '2026-02-01 08:00:00', '2026-02-01', 'APPROVED', '2026-02-01 08:20:00', '10', NULL, FALSE, 'Frame good');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130016', '90016', '211', '2026-02-01 08:00:00', '2026-02-01', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Annual planned');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130022', '90022', '209', '2026-02-01 08:00:00', '2026-02-01', 'APPROVED', '2026-02-01 08:20:00', '12', NULL, FALSE, 'Fuse replaced');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130024', '90024', '209', '2026-02-01 08:00:00', '2026-02-01', 'APPROVED', '2026-02-01 08:10:00', '8', NULL, FALSE, 'Rotation fine');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130025', '90025', '205', '2026-02-01 08:00:00', '2026-02-01', 'UNDER_SUPERVISOR_REVIEW', '2026-02-01 08:10:00', '10', NULL, FALSE, 'No clogging');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130026', '90026', '207', '2026-02-01 08:00:00', '2026-02-01', 'UNDER_SUPERVISOR_REVIEW', '2026-02-01 08:40:00', '30', NULL, FALSE, 'Cleaned');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130027', '90027', '210', '2026-02-01 08:00:00', '2026-02-01', 'UNDER_SUPERVISOR_REVIEW', '2026-02-01 08:15:00', '10', NULL, FALSE, 'Seal good');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130028', '90028', '211', '2026-02-01 08:00:00', '2026-02-01', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Annual seal');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130029', '90029', '205', '2026-02-01 08:00:00', '2026-02-01', 'UNDER_SUPERVISOR_REVIEW', '2026-02-01 08:25:00', '18', '98', FALSE, 'Flow normal');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130031', '90031', '210', '2026-02-01 08:00:00', '2026-02-01', 'APPROVED', '2026-02-01 08:10:00', '9', NULL, FALSE, 'Clamp tight');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130032', '90032', '211', '2026-02-01 08:00:00', '2026-02-01', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Yearly replace');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130036', '90036', '209', '2026-02-01 08:00:00', '2026-02-01', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Yearly replace');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130038', '90038', '209', '2026-02-01 08:00:00', '2026-02-01', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Annual relay');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130039', '90039', '210', '2026-02-01 08:00:00', '2026-02-01', 'APPROVED', '2026-02-01 08:10:00', '8', NULL, FALSE, 'Rail OK');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130040', '90040', '211', '2026-02-01 08:00:00', '2026-02-01', 'REJECTED', '2026-02-01 08:30:00', '15', NULL, TRUE, 'Improper tightening');


-- ─── Employee 208 — ALL STATUS EDGE CASES ─────────────────────────────────

-- TC-208-01: ASSIGNED (not yet started) — LOW task, Wf1 (Supervisor only)
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130013', '90013', '208', '2026-02-01 08:00:00', '2026-02-01', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Sensor voltage pending');

-- TC-208-02: IN-PROGRESS — MEDIUM task, Wf2 (Sup → LM)
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130018', '90019', '208', '2026-02-01 08:00:00', '2026-02-01', 'IN_PROGRESS', NULL, NULL, NULL, FALSE, 'Inspection in progress');

-- TC-208-03: UNDER_SUPERVISOR_REVIEW — LOW task, Wf1 (Supervisor only)
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130023', '90023', '208', '2026-02-01 08:00:00', '2026-02-01', 'UNDER_SUPERVISOR_REVIEW', '2026-02-01 08:15:00', '12', NULL, FALSE, 'Fan cleaned OK');

-- TC-208-04: UNDER_SUPERVISOR_REVIEW with DEVIATION — MEDIUM task, Wf2
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130017', '90018', '208', '2026-02-01 08:00:00', '2026-02-01', 'UNDER_SUPERVISOR_REVIEW', '2026-02-01 08:25:00', '20', '20.5', TRUE, 'Voltage low - deviation flagged');

-- TC-208-05: UNDER_LINE_MANAGER_REVIEW — HIGH task, Wf3 (Sup → LM → MM)
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130035', '90017', '208', '2026-02-01 08:00:00', '2026-02-01', 'UNDER_LINE_MANAGER_REVIEW', '2026-02-01 08:30:00', '20', NULL, FALSE, 'Contact wear - pending LM');

-- TC-208-06: UNDER_MAINT_MANAGER_REVIEW — HIGH task, Wf3 (Sup → LM → MM)
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130033', '90034', '208', '2026-02-01 08:00:00', '2026-02-01', 'UNDER_MAINT_MANAGER_REVIEW', '2026-02-01 08:10:00', '28', NULL, FALSE, 'PLC backup - pending MM');

-- TC-208-07: APPROVED — LOW task, Wf1 (single-level, only Supervisor)
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130021', '90024', '208', '2026-02-01 08:00:00', '2026-02-01', 'APPROVED', '2026-02-01 08:10:00', '9', NULL, FALSE, 'Fan rotation OK');

-- TC-208-08: APPROVED — MEDIUM task, Wf2 (Sup + LM both approved)
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130030', '90035', '208', '2026-02-01 08:00:00', '2026-02-01', 'APPROVED', '2026-02-01 09:00:00', '18', NULL, FALSE, 'I/O test passed - approved');

-- TC-208-09: APPROVED — HIGH task, Wf3 (all 3 levels approved)
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130019', '90021', '208', '2026-02-01 08:00:00', '2026-02-01', 'APPROVED', '2026-02-01 08:10:00', '10', NULL, FALSE, 'Fuse continuity good - all approved');

-- TC-208-10: REJECTED at supervisor level — HIGH task, Wf3
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130037', '90033', '208', '2026-02-01 08:00:00', '2026-02-01', 'REJECTED', '2026-02-01 08:05:00', '8', NULL, FALSE, 'Incomplete procedure - supervisor rejected');

-- TC-208-11: REJECTED at line manager level — MEDIUM task, Wf2
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130034', '90020', '208', '2026-02-01 08:00:00', '2026-02-01', 'REJECTED', '2026-02-01 09:30:00', '30', NULL, FALSE, 'Wrong cable spec - LM rejected');

-- TC-208-12: REJECTED at maintenance manager level — HIGH task, Wf3
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130063', '90037', '208', '2026-02-01 08:00:00', '2026-02-01', 'REJECTED', '2026-02-01 08:50:00', '14', NULL, FALSE, 'PPE non-compliant - MM rejected');

-- TC-208-13: ASSIGNED yearly task (annual frequency, stays ASSIGNED for most of month)
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130020', '90022', '208', '2026-02-01 08:00:00', '2026-02-01', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Annual fuse replacement');


-- =============================================================================
-- FEB 8, 2026 — WEEKLY RECURRING (UPCOMING)
-- =============================================================================
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130041', '90001', '207', '2026-02-08 08:00:00', '2026-02-08', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Auto generated');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130042', '90003', '205', '2026-02-08 08:00:00', '2026-02-08', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Auto generated');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130043', '90007', '210', '2026-02-08 08:00:00', '2026-02-08', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Auto generated');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130044', '90011', '211', '2026-02-08 08:00:00', '2026-02-08', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Auto generated');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130045', '90013', '209', '2026-02-08 08:00:00', '2026-02-08', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Auto generated');

INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130046', '90018', '208', '2026-02-08 08:00:00', '2026-02-08', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Auto generated');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130047', '90021', '208', '2026-02-08 08:00:00', '2026-02-08', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Auto generated');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130048', '90024', '208', '2026-02-08 08:00:00', '2026-02-08', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Auto generated');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130049', '90026', '205', '2026-02-08 08:00:00', '2026-02-08', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Auto generated');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130050', '90029', '207', '2026-02-08 08:00:00', '2026-02-08', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Auto generated');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130051', '90035', '209', '2026-02-08 08:00:00', '2026-02-08', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Auto generated');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130052', '90037', '208', '2026-02-08 08:00:00', '2026-02-08', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Auto generated');


-- =============================================================================
-- FEB 15, 2026
-- =============================================================================
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130053', '90001', '205', '2026-02-15 08:00:00', '2026-02-15', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Auto generated');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130054', '90003', '207', '2026-02-15 08:00:00', '2026-02-15', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Auto generated');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130055', '90007', '211', '2026-02-15 08:00:00', '2026-02-15', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Auto generated');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130056', '90011', '210', '2026-02-15 08:00:00', '2026-02-15', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Auto generated');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130057', '90013', '208', '2026-02-15 08:00:00', '2026-02-15', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Auto generated');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130058', '90018', '209', '2026-02-15 08:00:00', '2026-02-15', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Auto generated');


-- =============================================================================
-- FEB 22, 2026
-- =============================================================================
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130059', '90001', '207', '2026-02-22 08:00:00', '2026-02-22', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Auto generated');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130060', '90003', '205', '2026-02-22 08:00:00', '2026-02-22', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Auto generated');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130061', '90007', '210', '2026-02-22 08:00:00', '2026-02-22', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Auto generated');
INSERT INTO pm_schedule_execution (schedule_execution_id, task_schedule_id, employee_id, assigned_dttm, due_date, status, completed_dttm, time_taken, actual_value, deviation_flag, notes)
VALUES ('130062', '90011', '211', '2026-02-22 08:00:00', '2026-02-22', 'ASSIGNED', NULL, NULL, NULL, FALSE, 'Auto generated');
