package com.maint.pm_backend.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "system_jobs")
@Data
public class SystemJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "job_id")
    private Long jobId;

    @Column(name = "job_code", nullable = false, unique = true, length = 100)
    private String jobCode;

    @Column(name = "job_name", nullable = false)
    private String jobName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "target_api_endpoint")
    private String targetApiEndpoint;

    @Column(name = "is_active")
    private Boolean active;

    @Column(name = "cron_expression")
    private String cronExpression;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
