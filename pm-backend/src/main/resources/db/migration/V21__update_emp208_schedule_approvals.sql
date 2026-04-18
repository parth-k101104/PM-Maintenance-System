-- Set workflows based on criticality to ensure multi-level approvals exist for accurate frontend testing
UPDATE pm_std_tasks SET approval_workflow_id = 3 WHERE task_criticality = 'HIGH';
UPDATE pm_std_tasks SET approval_workflow_id = 2 WHERE task_criticality = 'MEDIUM';
UPDATE pm_std_tasks SET approval_workflow_id = 1 WHERE task_criticality = 'LOW';

-- Delete existing approvals for employee 208 to cleanly recreate them with multi-level logic
DELETE FROM pm_schedule_approval WHERE schedule_execution_id IN (
    SELECT schedule_execution_id FROM pm_schedule_execution WHERE employee_id = '208'
);

-- Now manually insert perfect approval states for Employee 208's tasks

-- Task 130013 (LOW: Workflow 1) - ASSIGNED
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at) VALUES ('150021', '130013', 1, '214', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Task 130017 (HIGH: Workflow 3) - UNDER_LINE_MANAGER_REVIEW
UPDATE pm_schedule_execution SET status = 'UNDER_LINE_MANAGER_REVIEW' WHERE schedule_execution_id = '130017';
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approval_due_date, approved_dttm, remarks, created_at, updated_at) VALUES ('150022', '130017', 1, '214', 'APPROVED', '2026-02-02', '2026-02-01 16:45', 'Supervisor verified', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at) VALUES ('150023', '130017', 2, '202', 'APPROVAL_REQUESTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at) VALUES ('150024', '130017', 3, '201', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Task 130019 (MEDIUM: Workflow 2) - ASSIGNED
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at) VALUES ('150025', '130019', 1, '214', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at) VALUES ('150026', '130019', 2, '202', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Task 130021 (HIGH: Workflow 3) - APPROVED
UPDATE pm_schedule_execution SET status = 'APPROVED' WHERE schedule_execution_id = '130021';
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approved_dttm, created_at, updated_at) VALUES ('150027', '130021', 1, '214', 'APPROVED', '2026-02-01 16:10', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approved_dttm, created_at, updated_at) VALUES ('150028', '130021', 2, '202', 'APPROVED', '2026-02-01 17:05', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approved_dttm, created_at, updated_at) VALUES ('150029', '130021', 3, '201', 'APPROVED', '2026-02-01 17:30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Task 130023 (LOW: Workflow 1) - APPROVED
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approved_dttm, created_at, updated_at) VALUES ('150030', '130023', 1, '214', 'APPROVED', '2026-02-01 16:15', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Task 130030 (MEDIUM: Workflow 2) - UNDER_SUPERVISOR_REVIEW
UPDATE pm_schedule_execution SET status = 'UNDER_SUPERVISOR_REVIEW' WHERE schedule_execution_id = '130030';
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at) VALUES ('150031', '130030', 1, '214', 'APPROVAL_REQUESTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at) VALUES ('150032', '130030', 2, '202', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Task 130033 (HIGH: Workflow 3) - UNDER_MAINT_MANAGER_REVIEW
UPDATE pm_schedule_execution SET status = 'UNDER_MAINT_MANAGER_REVIEW' WHERE schedule_execution_id = '130033';
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approved_dttm, created_at, updated_at) VALUES ('150033', '130033', 1, '214', 'APPROVED', '2026-02-01 16:10', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approved_dttm, created_at, updated_at) VALUES ('150034', '130033', 2, '202', 'APPROVED', '2026-02-01 16:30', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at) VALUES ('150035', '130033', 3, '201', 'APPROVAL_REQUESTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Task 130035 (MEDIUM: Workflow 2) - UNDER_LINE_MANAGER_REVIEW
UPDATE pm_schedule_execution SET status = 'UNDER_LINE_MANAGER_REVIEW' WHERE schedule_execution_id = '130035';
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, approved_dttm, created_at, updated_at) VALUES ('150036', '130035', 1, '214', 'APPROVED', '2026-02-01 16:20', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at) VALUES ('150037', '130035', 2, '202', 'APPROVAL_REQUESTED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Task 130037 (MEDIUM: Workflow 2) - ASSIGNED
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at) VALUES ('150038', '130037', 1, '214', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at) VALUES ('150039', '130037', 2, '202', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Week 2/3 Future tasks
-- 130046 (HIGH: Workflow 3) - ASSIGNED
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at) VALUES ('150040', '130046', 1, '214', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at) VALUES ('150041', '130046', 2, '202', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at) VALUES ('150042', '130046', 3, '201', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 130048 (LOW: Workflow 1) - ASSIGNED
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at) VALUES ('150043', '130048', 1, '214', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 130052 (MEDIUM: Workflow 2) - ASSIGNED
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at) VALUES ('150044', '130052', 1, '214', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at) VALUES ('150045', '130052', 2, '202', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 130057 (LOW: Workflow 1) - ASSIGNED
INSERT INTO pm_schedule_approval (execution_approval_id, schedule_execution_id, approval_level, approver_id, approval_status, created_at, updated_at) VALUES ('150046', '130057', 1, '214', 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
