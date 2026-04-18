package com.maint.pm_backend.dto;

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
}
