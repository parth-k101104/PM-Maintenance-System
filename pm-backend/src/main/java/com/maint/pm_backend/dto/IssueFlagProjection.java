package com.maint.pm_backend.dto;

import java.time.LocalDateTime;

public interface IssueFlagProjection {
    Long getFlagId();
    Long getScheduleExecutionId();

    // Part + Machine + Location
    Long getPartId();
    String getPartName();
    Long getEquipmentId();
    String getEquipmentName();
    String getLocation();

    // Attendant
    Long getAttendantId();
    String getAttendantName();

    // Flag info
    String getStatus();
    String getCriticality();
    LocalDateTime getDueDate();
    LocalDateTime getRaisedDttm();
}
