package com.maint.pm_backend.entity;

import com.maint.pm_backend.entity.enums.TaskApprovalStatus;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "pm_schedule_approval")
@Data
public class PmScheduleApproval {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "execution_approval_id")
    private Long executionApprovalId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "schedule_execution_id")
    private PmScheduleExecution scheduleExecution;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approver_id")
    private Employee approver;

    @Column(name = "approval_status", length = 50)
    @Enumerated(EnumType.STRING)
    private TaskApprovalStatus approvalStatus;

    @Column(name = "approved_dttm")
    private LocalDateTime approvedDttm;

    @Column(name = "approval_level")
    private Integer approvalLevel;

    @Column(name = "approval_due_date")
    private LocalDateTime approvalDueDate;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
