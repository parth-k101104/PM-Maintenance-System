ALTER TABLE pm_std_tasks
    RENAME COLUMN tool TO tools;


ALTER TABLE pm_std_tasks
ALTER COLUMN tools TYPE JSONB
USING (
    CASE
        WHEN tools IS NULL THEN '[]'::jsonb
        ELSE jsonb_build_array(tools)
    END
);

ALTER TABLE pm_std_tasks
    ALTER COLUMN tools SET DEFAULT '[]'::jsonb;

