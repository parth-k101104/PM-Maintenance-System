package com.maint.pm_backend.dto;

public interface TaskDetailsProjection {
    Long getScheduleExecutionId();
    Long getStdTaskId();
    String getTaskRefNo();
    String getTaskName();
    Integer getTimeRequired();
    String getMachineName();
    String getMachineElementName();
    String getMachinePartName();
    String getZone();
    String getBlock();
    String getLineName();
    String getLineCode();
    Long getLineId();
    String getTaskCriticality();
    java.time.LocalDateTime getDueDate();
}
