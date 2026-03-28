ALTER TABLE pm_schedule_approval
ALTER COLUMN approval_level SET NOT NULL;

ALTER TABLE pm_schedule_approval
    ADD CONSTRAINT fk_approval_level
        FOREIGN KEY (approval_level)
            REFERENCES pm_approval_levels(level_id)
            ON DELETE RESTRICT;