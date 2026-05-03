package com.maint.pm_backend.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "system_job_schedules")
@Data
public class SystemJobSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "schedule_id")
    private Long scheduleId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private SystemJob job;

    @Column(name = "schedule_code", nullable = false, unique = true, length = 100)
    private String scheduleCode;

    @Column(name = "schedule_name", nullable = false)
    private String scheduleName;

    @Column(name = "quartz_job_name", nullable = false, length = 150)
    private String quartzJobName;

    @Column(name = "quartz_job_group", nullable = false, length = 150)
    private String quartzJobGroup;

    @Column(name = "quartz_trigger_name", nullable = false, length = 150)
    private String quartzTriggerName;

    @Column(name = "quartz_trigger_group", nullable = false, length = 150)
    private String quartzTriggerGroup;

    @Column(name = "cron_expression", nullable = false, length = 100)
    private String cronExpression;

    @Column(name = "time_zone", nullable = false, length = 100)
    private String timeZone;

    @Column(name = "is_active")
    private Boolean active;

    @Column(name = "misfire_policy", length = 50)
    private String misfirePolicy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
