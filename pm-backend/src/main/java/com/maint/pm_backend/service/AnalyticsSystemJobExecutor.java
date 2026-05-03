package com.maint.pm_backend.service;

import com.maint.pm_backend.entity.SystemJob;
import com.maint.pm_backend.entity.enums.SystemJobCode;
import com.maint.pm_backend.entity.enums.SystemJobTriggerType;
import org.springframework.stereotype.Service;

@Service
public class AnalyticsSystemJobExecutor implements SystemJobExecutor {

    private final AnalyticsJobClient analyticsJobClient;

    public AnalyticsSystemJobExecutor(AnalyticsJobClient analyticsJobClient) {
        this.analyticsJobClient = analyticsJobClient;
    }

    @Override
    public SystemJobCode jobCode() {
        return SystemJobCode.NIGHTLY_PHM_ANALYTICS_SYNC;
    }

    @Override
    public String execute(SystemJob job, SystemJobTriggerType triggerType, Long triggeredByEmployeeId, boolean persist) {
        return analyticsJobClient.runAnalyticsJob(job, triggerType, triggeredByEmployeeId, persist);
    }
}
