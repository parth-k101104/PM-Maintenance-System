package com.maint.pm_backend.service;

import com.maint.pm_backend.entity.SystemJob;
import com.maint.pm_backend.entity.enums.SystemJobCode;
import com.maint.pm_backend.entity.enums.SystemJobTriggerType;
import org.springframework.stereotype.Service;

@Service
public class ShortTermAnalyticsSystemJobExecutor implements SystemJobExecutor {

    private final AnalyticsJobClient analyticsJobClient;

    public ShortTermAnalyticsSystemJobExecutor(AnalyticsJobClient analyticsJobClient) {
        this.analyticsJobClient = analyticsJobClient;
    }

    @Override
    public SystemJobCode jobCode() {
        return SystemJobCode.SHORT_TERM_PHM_ANALYTICS_SYNC;
    }

    @Override
    public String execute(SystemJob job, SystemJobTriggerType triggerType, Long triggeredByEmployeeId, boolean persist) {
        return analyticsJobClient.runAnalyticsJob(job, triggerType, triggeredByEmployeeId, persist);
    }
}
