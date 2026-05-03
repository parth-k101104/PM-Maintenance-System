package com.maint.pm_backend.service;

import com.maint.pm_backend.entity.enums.SystemJobCode;
import com.maint.pm_backend.entity.enums.SystemJobTriggerType;
import com.maint.pm_backend.config.SpringContext;
import org.quartz.Job;
import org.quartz.JobDataMap;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.springframework.stereotype.Component;

@Component
public class SystemQuartzJob implements Job {

    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        JobDataMap dataMap = context.getMergedJobDataMap();
        String jobCode = dataMap.getString("jobCode");
        SystemJobRunnerService systemJobRunnerService = SpringContext.getBean(SystemJobRunnerService.class);

        try {
            systemJobRunnerService.runJob(
                    SystemJobCode.valueOf(jobCode),
                    SystemJobTriggerType.CRON,
                    null,
                    true
            );
        } catch (Exception ex) {
            throw new JobExecutionException("System job failed: " + jobCode, ex, false);
        }
    }
}
