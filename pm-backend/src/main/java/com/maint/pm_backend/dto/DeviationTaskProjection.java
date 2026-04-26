package com.maint.pm_backend.dto;

public interface DeviationTaskProjection {
    Long getScheduleExecutionId();
    Long getStdTaskId();
    String getTaskRefNo();
    String getTaskName();
    String getMachineName();
    String getMachineElementName();
    String getMachinePartName();
    String getZone();
    String getBlock();
    String getLineName();
    String getLineCode();
    Long getLineId();
    String getTaskCriticality();
    java.math.BigDecimal getActualValue();
    Boolean getDeviationFlag();
    java.math.BigDecimal getTimeTaken();
    String getEmployeeName();
    java.time.LocalDateTime getCompletedDate();
    String getUom();
    java.math.BigDecimal getStandardValue();
    java.math.BigDecimal getToleranceMin();
    java.math.BigDecimal getToleranceMax();
}
