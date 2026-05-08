package com.maint.pm_backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "pm_task_schedules")
@Data
public class PmTaskSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "task_schedule_id")
    private Long taskScheduleId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "std_task_id")
    private PmStdTask stdTask;

    @Column(name = "last_schedule_date")
    private LocalDate lastScheduleDate;

    @Column(name = "next_schedule_date")
    private LocalDate nextScheduleDate;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "last_updated_by")
    private Long lastUpdatedBy;

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
