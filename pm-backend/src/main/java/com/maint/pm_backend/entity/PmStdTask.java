package com.maint.pm_backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.List;
import java.math.BigDecimal;

@Entity
@Table(name = "pm_std_tasks")
@Data
public class PmStdTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "std_task_id")
    private Long stdTaskId;

    @Column(name = "task_ref_no", length = 100)
    private String taskRefNo;

    @Column(name = "element_id")
    private Long elementId;

    @Column(name = "part_id")
    private Long partId;

    @Column(name = "task_criticality", length = 50)
    private String taskCriticality;

    @Column(name = "maintenance_strategy", length = 100)
    private String maintenanceStrategy;

    @Column(name = "method", columnDefinition = "TEXT")
    private String method;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tools", columnDefinition = "jsonb")
    private List<String> tools;

    @Column(name = "assignee_role_id")
    private Long assigneeRoleId;

    @Column(name = "estimated_req_time")
    private Integer estimatedReqTime;

    @Column(name = "mode", length = 50)
    private String mode;

    @Column(name = "frequency", length = 100)
    private String frequency;

    @Column(name = "standard_value")
    private BigDecimal standardValue;

    @Column(name = "tolerance_min")
    private BigDecimal toleranceMin;

    @Column(name = "tolerance_max")
    private BigDecimal toleranceMax;

    @Column(name = "uom", length = 50)
    private String uom;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "last_updated_by")
    private Long lastUpdatedBy;

    @Column(name = "approval_workflow_id")
    private Long approvalWorkflowId;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
