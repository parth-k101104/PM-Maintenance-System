package com.maint.pm_backend.dto;

import com.maint.pm_backend.entity.enums.SystemJobTriggerType;
import lombok.Data;

@Data
public class SystemJobRunRequest {
    private Boolean persist = true;
    private SystemJobTriggerType triggerType = SystemJobTriggerType.MANUAL_API;
    private Long triggeredByEmployeeId;
}
