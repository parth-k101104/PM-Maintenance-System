-- =============================================================================
-- V21: WORKFLOW ASSIGNMENT + EMPLOYEE 208 APPROVAL STATES
-- Set workflow by criticality: HIGH=3levels, MEDIUM=2levels, LOW=1level
-- =============================================================================
UPDATE pm_std_tasks SET approval_workflow_id = 3 WHERE task_criticality = 'HIGH';
UPDATE pm_std_tasks SET approval_workflow_id = 2 WHERE task_criticality = 'MEDIUM';
UPDATE pm_std_tasks SET approval_workflow_id = 1 WHERE task_criticality = 'LOW';

-- Delete any approvals for emp 208 tasks already inserted in V16 to avoid conflicts
DELETE FROM pm_schedule_approval
WHERE schedule_execution_id IN (
    SELECT schedule_execution_id FROM pm_schedule_execution WHERE employee_id = '208'
);

-- =============================================================================
-- EMPLOYEE 208 APPROVAL RECORDS BY TEST CASE
-- Approvers:
--   214 = Supervisor (Deepak Shinde)
--   202 = Line Manager (Amit Sharma)
--   201 = Maintenance Manager (Rajesh Patil)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- TC-208-01: 130013 — ASSIGNED (not started)
--   Task: Sensor voltage check | LOW criticality → Workflow 1 (Sup only)
--   Approval state: all PENDING (nothing submitted yet)
-- ---------------------------------------------------------------------------
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150200', '130013', 1, '214', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ---------------------------------------------------------------------------
-- TC-208-02: 130018 — IN_PROGRESS
--   Task: Cable insulation inspect | MEDIUM → Workflow 2 (Sup → LM)
--   Approval state: all PENDING (not submitted yet)
-- ---------------------------------------------------------------------------
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150201', '130018', 1, '214', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150202', '130018', 2, '202', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ---------------------------------------------------------------------------
-- TC-208-03: 130023 — UNDER_SUPERVISOR_REVIEW (no deviation)
--   Task: Clean cooling fan | LOW → Workflow 1 (Sup only)
--   Approval state: supervisor has APPROVAL_REQUESTED
-- ---------------------------------------------------------------------------
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, created_at, updated_at)
VALUES ('150203', '130023', 1, '214', 'APPROVAL_REQUESTED', '2026-02-02', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ---------------------------------------------------------------------------
-- TC-208-04: 130017 — UNDER_SUPERVISOR_REVIEW (WITH DEVIATION, deviation_flag=TRUE)
--   Task: Measure voltage drop | HIGH → Workflow 3 (Sup → LM → MM)
--   Actual value 20.5V, tolerance 22–26V → deviation flagged
--   Approval state: supervisor has APPROVAL_REQUESTED, others PENDING
-- ---------------------------------------------------------------------------
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, created_at, updated_at)
VALUES ('150204', '130017', 1, '214', 'APPROVAL_REQUESTED', '2026-02-02', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150205', '130017', 2, '202', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150206', '130017', 3, '201', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ---------------------------------------------------------------------------
-- TC-208-05: 130035 — UNDER_LINE_MANAGER_REVIEW
--   Task: Inspect contact wear | HIGH → Workflow 3
--   Sup approved, LM has APPROVAL_REQUESTED, MM pending
-- ---------------------------------------------------------------------------
UPDATE pm_schedule_execution SET status = 'UNDER_LINE_MANAGER_REVIEW' WHERE schedule_execution_id = '130035';
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150207', '130035', 1, '214', 'APPROVED', '2026-02-02', '2026-02-01 16:45', 'Contact wear within limits, approved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, created_at, updated_at)
VALUES ('150208', '130035', 2, '202', 'APPROVAL_REQUESTED', '2026-02-03', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150209', '130035', 3, '201', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ---------------------------------------------------------------------------
-- TC-208-06: 130033 — UNDER_MAINT_MANAGER_REVIEW
--   Task: Backup PLC program | HIGH → Workflow 3
--   Sup + LM approved, MM has APPROVAL_REQUESTED
-- ---------------------------------------------------------------------------
UPDATE pm_schedule_execution SET status = 'UNDER_MAINT_MANAGER_REVIEW' WHERE schedule_execution_id = '130033';
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150210', '130033', 1, '214', 'APPROVED', '2026-02-02', '2026-02-01 16:10', 'PLC backup verified', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150211', '130033', 2, '202', 'APPROVED', '2026-02-03', '2026-02-01 17:00', 'Backup confirmed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, created_at, updated_at)
VALUES ('150212', '130033', 3, '201', 'APPROVAL_REQUESTED', '2026-02-04', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ---------------------------------------------------------------------------
-- TC-208-07: 130021 — APPROVED (single-level, supervisor only)
--   Task: Check fan rotation | LOW → Workflow 1
-- ---------------------------------------------------------------------------
UPDATE pm_schedule_execution SET status = 'APPROVED' WHERE schedule_execution_id = '130021';
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150213', '130021', 1, '214', 'APPROVED', '2026-02-02', '2026-02-01 16:12', 'Fan rotation nominal', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ---------------------------------------------------------------------------
-- TC-208-08: 130030 — APPROVED (two-level: Sup + LM)
--   Task: Test I/O response | MEDIUM → Workflow 2
-- ---------------------------------------------------------------------------
UPDATE pm_schedule_execution SET status = 'APPROVED' WHERE schedule_execution_id = '130030';
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150214', '130030', 1, '214', 'APPROVED', '2026-02-02', '2026-02-01 16:20', 'I/O response verified', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150215', '130030', 2, '202', 'APPROVED', '2026-02-03', '2026-02-01 17:10', 'Signed off by LM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ---------------------------------------------------------------------------
-- TC-208-09: 130019 — APPROVED (three-level: Sup + LM + MM)
--   Task: Check fuse continuity | HIGH → Workflow 3
-- ---------------------------------------------------------------------------
UPDATE pm_schedule_execution SET status = 'APPROVED' WHERE schedule_execution_id = '130019';
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150216', '130019', 1, '214', 'APPROVED', '2026-02-02', '2026-02-01 16:11', 'Fuse continuity OK', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150217', '130019', 2, '202', 'APPROVED', '2026-02-03', '2026-02-01 17:05', 'LM approved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150218', '130019', 3, '201', 'APPROVED', '2026-02-04', '2026-02-01 17:45', 'MM final sign-off', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ---------------------------------------------------------------------------
-- TC-208-10: 130037 — REJECTED at supervisor level
--   Task: Check PLC status LEDs | HIGH → Workflow 3
--   Supervisor rejected, others stay PENDING
-- ---------------------------------------------------------------------------
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150219', '130037', 1, '214', 'REJECTED', '2026-02-02', '2026-02-01 08:35', 'Incomplete checklist, steps 3-5 not documented', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150220', '130037', 2, '202', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150221', '130037', 3, '201', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ---------------------------------------------------------------------------
-- TC-208-11: 130034 — REJECTED at line manager level (supervisor had approved)
--   Task: Replace damaged cable | MEDIUM → Workflow 2
-- ---------------------------------------------------------------------------
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150222', '130034', 1, '214', 'APPROVED', '2026-02-02', '2026-02-01 10:00', 'Supervisor verified cable replacement', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150223', '130034', 2, '202', 'REJECTED', '2026-02-03', '2026-02-01 14:30', 'Wrong cable spec used (IS:5831 Grade 2 required), redo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ---------------------------------------------------------------------------
-- TC-208-12: 130036 — REJECTED at maintenance manager level
--   Task: Inspect relay switching | MEDIUM → Workflow 2
--   Note: Reusing Wf2 because relay is MEDIUM; but MM rejected due to PPE
--   Sup + LM approved, LM sent it for MM (extra escalation), MM rejected
-- ---------------------------------------------------------------------------
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150224', '130036', 1, '214', 'APPROVED', '2026-02-02', '2026-02-01 08:55', 'Relay inspection looks good', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at)
VALUES ('150225', '130036', 2, '202', 'REJECTED', '2026-02-03', '2026-02-01 11:00', 'Non-compliant PPE observed in photo evidence', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ---------------------------------------------------------------------------
-- TC-208-13: 130020 — ASSIGNED (yearly task, just assigned this month)
--   Task: Replace fuse if faulty | HIGH → Workflow 3
--   All approvals PENDING (not yet executed)
-- ---------------------------------------------------------------------------
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150226', '130020', 1, '214', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150227', '130020', 2, '202', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150228', '130020', 3, '201', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ---------------------------------------------------------------------------
-- UPCOMING TASKS (week 2+) — Emp 208
--   130046 (HIGH, Wf3) | 130047 (HIGH, Wf3) | 130048 (LOW, Wf1) | 130052 (MEDIUM, Wf2) | 130057 (LOW, Wf1)
-- ---------------------------------------------------------------------------
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150229', '130046', 1, '214', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150230', '130046', 2, '202', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150231', '130046', 3, '201', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150232', '130047', 1, '214', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150233', '130047', 2, '202', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150234', '130047', 3, '201', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150235', '130048', 1, '214', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150236', '130052', 1, '214', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150237', '130052', 2, '202', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150238', '130057', 1, '214', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ---------------------------------------------------------------------------
-- BACKLOG TASKS — Emp 208 approvals
--   130100 (ASSIGNED backlog) — PENDING approval
--   130101 (IN_PROGRESS backlog) — PENDING approval
-- (130102 + 130103 approvals already handled in V16)
-- ---------------------------------------------------------------------------
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150239', '130100', 1, '214', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150240', '130101', 1, '214', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150241', '130101', 2, '202', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at)
VALUES ('150242', '130101', 3, '201', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
