package com.maint.pm_backend.dto;

import lombok.Data;

@Data
public class UpdateScheduleAssignmentRequest {
    private Long assigneeEmployeeId;
    private Long supervisorId;
}
