package com.maint.pm_backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

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
}
