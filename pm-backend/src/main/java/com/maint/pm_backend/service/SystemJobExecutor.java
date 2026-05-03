package com.maint.pm_backend.service;

import com.maint.pm_backend.entity.SystemJob;
import com.maint.pm_backend.entity.enums.SystemJobCode;
import com.maint.pm_backend.entity.enums.SystemJobTriggerType;

public interface SystemJobExecutor {
    SystemJobCode jobCode();

    String execute(SystemJob job, SystemJobTriggerType triggerType, Long triggeredByEmployeeId, boolean persist);
}
