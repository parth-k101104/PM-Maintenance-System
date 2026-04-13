package com.maint.pm_backend.dto;

public interface QRTaskProjection {
    Long getScheduleExecutionId();
    Long getStdTaskId();
    String getTaskRefNo();
    String getTaskName();
    Integer getTimeRequired();
    String getUom();
    String getMachineName();
    String getMachineElementName();
    String getMachinePartName();
    String getZone();
    String getBlock();
    String getLineName();
    java.time.LocalDateTime getDueDate();
}
