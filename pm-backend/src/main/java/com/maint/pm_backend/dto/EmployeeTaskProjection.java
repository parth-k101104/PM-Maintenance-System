package com.maint.pm_backend.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Flat projection for a single task execution assigned to an employee, scoped to a supervisor's review */
public interface EmployeeTaskProjection {
    Long getScheduleExecutionId();
    String getTaskRefNo();
    String getTaskName();
    String getMachineName();
    String getMachineElementName();
    String getMachinePartName();
    String getZone();
    String getBlock();
    String getLineName();
    String getLineCode();
    LocalDateTime getDueDate();
    LocalDateTime getCompletedDate();
    String getTaskCriticality();
    String getExecutionStatus();
    BigDecimal getTimeTaken();
    Boolean getDeviationFlag();
    BigDecimal getActualValue();
    String getUom();
    BigDecimal getStandardValue();
}
