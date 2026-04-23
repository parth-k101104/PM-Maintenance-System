-- =============================================================================
-- PM SCHEDULE APPROVAL SEED DATA — NON-EMPLOYEE-208 TASKS
-- Approver IDs:
--   214 = Deepak Shinde  (Supervisor, level 1)
--   202 = Amit Sharma    (Line Manager, level 2)
--   201 = Rajesh Patil   (Maint Manager, level 3)
-- =============================================================================

-- ─── 130001 (emp 205, APPROVED, Wf2: Sup+LM) ─────────────────────────────
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150001', '130001', 1, '214', 'APPROVED', '2026-02-02', '2026-02-01 16:30', 'Vibration within tolerance', '2026-02-01 16:00', '2026-02-01 16:30');
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150002', '130001', 2, '202', 'APPROVED', '2026-02-02', '2026-02-01 17:15', 'Manager reviewed OK', '2026-02-01 16:30', '2026-02-01 17:15');

-- ─── 130002 (emp 210, APPROVED, Wf1: Sup only) ───────────────────────────
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150003', '130002', 1, '214', 'APPROVED', '2026-02-02', '2026-02-01 16:35', 'Shaft inspection OK', '2026-02-01 16:00', '2026-02-01 16:35');

-- ─── 130003 (emp 207, APPROVED, Wf3: all 3 levels) ───────────────────────
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150004', '130003', 1, '214', 'APPROVED', '2026-02-02', '2026-02-01 16:20', 'Temp verified', '2026-02-01 16:00', '2026-02-01 16:20');
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150005', '130003', 2, '202', 'APPROVED', '2026-02-02', '2026-02-01 17:00', 'LM approved', '2026-02-01 16:20', '2026-02-01 17:00');
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150006', '130003', 3, '201', 'APPROVED', '2026-02-02', '2026-02-01 17:30', 'MM final OK', '2026-02-01 17:00', '2026-02-01 17:30');

-- ─── 130004 (emp 211, APPROVED, Wf2: Sup+LM) ─────────────────────────────
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150007', '130004', 1, '214', 'APPROVED', '2026-02-02', '2026-02-01 16:40', 'Lubrication checked', '2026-02-01 16:00', '2026-02-01 16:40');
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150008', '130004', 2, '202', 'APPROVED', '2026-02-02', '2026-02-01 17:25', 'Final approval', '2026-02-01 16:40', '2026-02-01 17:25');

-- ─── 130007 (emp 211, APPROVED, Wf1) ─────────────────────────────────────
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150009', '130007', 1, '214', 'APPROVED', '2026-02-02', '2026-02-01 16:32', 'Bolts tightened OK', '2026-02-01 16:00', '2026-02-01 16:32');

-- ─── 130008 (emp 210, APPROVED, Wf1) ─────────────────────────────────────
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150010', '130008', 1, '214', 'APPROVED', '2026-02-02', '2026-02-01 16:45', 'Bolts replaced OK', '2026-02-01 16:00', '2026-02-01 16:45');

-- ─── 130009 (emp 211, APPROVED, Wf3: all 3) ──────────────────────────────
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150011', '130009', 1, '214', 'APPROVED', '2026-02-02', '2026-02-01 16:15', 'Belt condition OK', '2026-02-01 16:00', '2026-02-01 16:15');
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150012', '130009', 2, '202', 'APPROVED', '2026-02-02', '2026-02-01 17:10', 'LM approved', '2026-02-01 16:15', '2026-02-01 17:10');
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150013', '130009', 3, '201', 'APPROVED', '2026-02-02', '2026-02-01 18:00', 'MM final approved', '2026-02-01 17:10', '2026-02-01 18:00');

-- ─── 130011 (emp 211, APPROVED, Wf1) ─────────────────────────────────────
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approved_dttm, created_at, updated_at)
VALUES ('150014', '130011', 1, '214', 'APPROVED', '2026-02-01 16:17', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ─── 130012 (emp 210, APPROVED, Wf2) ─────────────────────────────────────
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approved_dttm, created_at, updated_at)
VALUES ('150015', '130012', 1, '214', 'APPROVED', '2026-02-01 16:42', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approved_dttm, created_at, updated_at)
VALUES ('150016', '130012', 2, '202', 'APPROVED', '2026-02-01 17:20', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ─── 130015 (emp 210, APPROVED, Wf1) ─────────────────────────────────────
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approved_dttm, created_at, updated_at)
VALUES ('150017', '130015', 1, '214', 'APPROVED', '2026-02-01 16:22', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ─── 130022 (emp 209, APPROVED, Wf3) ─────────────────────────────────────
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approved_dttm, created_at, updated_at)
VALUES ('150018', '130022', 1, '214', 'APPROVED', '2026-02-01 16:25', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approved_dttm, created_at, updated_at)
VALUES ('150019', '130022', 2, '202', 'APPROVED', '2026-02-01 17:08', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approved_dttm, created_at, updated_at)
VALUES ('150020', '130022', 3, '201', 'APPROVED', '2026-02-01 17:45', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ─── 130024 (emp 209, APPROVED, Wf1) ─────────────────────────────────────
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approved_dttm, created_at, updated_at)
VALUES ('150060', '130024', 1, '214', 'APPROVED', '2026-02-01 16:12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ─── 130025 (emp 205, UNDER_SUPERVISOR_REVIEW, Wf3) ─────────────────────
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, created_at, updated_at)
VALUES ('150061', '130025', 1, '214', 'APPROVAL_REQUESTED', '2026-02-02', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150062', '130025', 2, '202', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150063', '130025', 3, '201', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ─── 130026 (emp 207, UNDER_SUPERVISOR_REVIEW, Wf3) ─────────────────────
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, created_at, updated_at)
VALUES ('150064', '130026', 1, '214', 'APPROVAL_REQUESTED', '2026-02-02', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150065', '130026', 2, '202', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150066', '130026', 3, '201', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ─── 130027 (emp 210, UNDER_SUPERVISOR_REVIEW, Wf2) ─────────────────────
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, created_at, updated_at)
VALUES ('150067', '130027', 1, '214', 'APPROVAL_REQUESTED', '2026-02-02', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150068', '130027', 2, '202', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ─── 130029 (emp 205, UNDER_SUPERVISOR_REVIEW, Wf2) ─────────────────────
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, created_at, updated_at)
VALUES ('150069', '130029', 1, '214', 'APPROVAL_REQUESTED', '2026-02-02', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150070', '130029', 2, '202', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ─── 130031 (emp 210, APPROVED, Wf1) ─────────────────────────────────────
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approved_dttm, created_at, updated_at)
VALUES ('150071', '130031', 1, '214', 'APPROVED', '2026-02-01 16:12', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ─── 130039 (emp 210, APPROVED, Wf1) ─────────────────────────────────────
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approved_dttm, created_at, updated_at)
VALUES ('150072', '130039', 1, '214', 'APPROVED', '2026-02-01 16:11', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ─── 130040 (emp 211, REJECTED by supervisor, Wf1) ───────────────────────
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150073', '130040', 1, '214', 'REJECTED', '2026-02-02', '2026-02-01 16:55', 'Improper tightening technique', '2026-02-01 16:00', '2026-02-01 16:55');

-- ─── 130105 (emp 210 backlog, UNDER_SUPERVISOR_REVIEW, Wf1) ──────────────
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, created_at, updated_at)
VALUES ('150074', '130105', 1, '214', 'APPROVAL_REQUESTED', '2026-01-26', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ─── 130102 (emp 208 backlog, REJECTED by supervisor, Wf3) ──────────────
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approved_dttm, remarks, created_at, updated_at)
VALUES ('150075', '130102', 1, '214', 'REJECTED', '2026-01-25 10:15', 'Incomplete diagnostics procedure, PLC fault not properly documented', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150076', '130102', 2, '202', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150077', '130102', 3, '201', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ─── 130103 (emp 208 backlog Jan 25, APPROVED, Wf2) ──────────────────────
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approved_dttm, remarks, created_at, updated_at)
VALUES ('150078', '130103', 1, '214', 'APPROVED', '2026-01-25 11:00', 'I/O response within spec', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approved_dttm, remarks, created_at, updated_at)
VALUES ('150079', '130103', 2, '202', 'APPROVED', '2026-01-25 14:00', 'LM sign-off done', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ─── Upcoming tasks (no approvals needed yet — status = ASSIGNED) ─────────
-- 130041-130062: Weekly tasks, all ASSIGNED, no approvals yet
