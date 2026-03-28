ALTER TABLE pm_std_tasks
    ADD COLUMN approval_workflow_id BIGINT;

UPDATE pm_std_tasks st
SET approval_workflow_id = sub.workflow_id
    FROM (
    SELECT
        ts.std_task_id,
        CASE
            WHEN MAX(psa.approval_level) = 1 THEN 1
            WHEN MAX(psa.approval_level) = 2 THEN 2
            WHEN MAX(psa.approval_level) >= 3 THEN 3
        END AS workflow_id
    FROM pm_schedule_approval psa
    JOIN pm_schedule_execution pse
        ON pse.schedule_execution_id = psa.schedule_execution_id
    JOIN pm_task_schedules ts
        ON ts.task_schedule_id = pse.task_schedule_id
    GROUP BY ts.std_task_id
) sub
WHERE st.std_task_id = sub.std_task_id;

UPDATE pm_std_tasks
SET approval_workflow_id = 1
WHERE approval_workflow_id IS NULL;

ALTER TABLE pm_std_tasks
    ADD CONSTRAINT fk_std_task_workflow
        FOREIGN KEY (approval_workflow_id)
            REFERENCES pm_approval_workflow(workflow_id);

ALTER TABLE pm_std_tasks
    ALTER COLUMN approval_workflow_id SET NOT NULL;