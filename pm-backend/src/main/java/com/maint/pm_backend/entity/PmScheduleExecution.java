package com.maint.pm_backend.entity;

import com.maint.pm_backend.entity.enums.TaskExecutionStatus;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "pm_schedule_execution")
@Data
public class PmScheduleExecution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "schedule_execution_id")
    private Long scheduleExecutionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_schedule_id")
    private PmTaskSchedule taskSchedule;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    @Column(name = "assigned_dttm")
    private LocalDateTime assignedDttm;

    @Column(name = "due_date")
    private LocalDateTime dueDate;

    @Column(name = "status", length = 50)
    @Enumerated(EnumType.STRING)
    private TaskExecutionStatus status;

    @Column(name = "completed_dttm")
    private LocalDateTime completedDttm;

    @Column(name = "time_taken")
    private java.math.BigDecimal timeTaken;

    @Column(name = "actual_value")
    private java.math.BigDecimal actualValue;

    @Column(name = "deviation_flag")
    private Boolean deviationFlag;

    @Column(name = "reschedule_flag")
    private Boolean rescheduleFlag;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
