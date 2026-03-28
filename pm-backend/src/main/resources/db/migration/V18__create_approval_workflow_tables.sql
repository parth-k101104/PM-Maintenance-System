
CREATE TABLE pm_approval_levels (
                                    level_id INT PRIMARY KEY,
                                    level_name VARCHAR(50) NOT NULL,
                                    approver_role_id BIGINT NOT NULL,
                                    description TEXT,

                                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE pm_approval_workflow (
                                      workflow_id BIGSERIAL PRIMARY KEY,
                                      workflow_name VARCHAR(100) NOT NULL,

                                      levels JSONB NOT NULL,

                                      description TEXT,
                                      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


INSERT INTO pm_approval_levels (level_id, level_name, approver_role_id, description)
VALUES
    (1, 'Supervisor', 3, 'First level approval by Supervisor'),
    (2, 'Line Manager', 2, 'Second level approval by Line Manager'),
    (3, 'Maintenance Manager', 1, 'Final approval by Maintenance Manager');


INSERT INTO pm_approval_workflow (workflow_name, levels, description)
VALUES (
           'Single Level Approval',
           '[
             {"level": 1}
           ]'::jsonb,
           'Only Supervisor approval required'
       );

INSERT INTO pm_approval_workflow (workflow_name, levels, description)
VALUES (
           'Two Level Approval',
           '[
             {"level": 1},
             {"level": 2}
           ]'::jsonb,
           'Supervisor followed by Line Manager approval'
       );

INSERT INTO pm_approval_workflow (workflow_name, levels, description)
VALUES (
           'Three Level Approval',
           '[
             {"level": 1},
             {"level": 2},
             {"level": 3}
           ]'::jsonb,
           'Full approval chain up to Maintenance Manager'
       );