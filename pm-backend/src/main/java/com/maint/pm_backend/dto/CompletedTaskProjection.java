package com.maint.pm_backend.dto;

import java.time.LocalDateTime;

public interface CompletedTaskProjection {
    Long getScheduleExecutionId();
    String getTaskName();
    String getMachineName();
    String getMachineElementName();
    String getMachinePartName();
    Integer getStdAmountOfTime();
    Double getTimeTaken();
    String getZone();
    String getBlock();
    Long getLineId();
    String getLineCode();
    String getLineName();
    String getStatus();
    String getTaskCriticality();
    String getSupervisorName();
    String getReviewerName();
    String getReviewType();

    // Reschedule / rejection fields
    Boolean getRescheduleFlag();
    Long getParentScheduleExecutionId();

    // For REJECTED tasks: the linked rescheduled child execution
    Long getRescheduledExecutionId();
    String getRescheduledStatus();
    LocalDateTime getRescheduledDueDate();
}
