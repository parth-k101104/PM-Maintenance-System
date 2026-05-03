package com.maint.pm_backend.service;

import com.maint.pm_backend.entity.SystemJob;
import com.maint.pm_backend.entity.enums.SystemJobCode;
import com.maint.pm_backend.entity.enums.SystemJobTriggerType;
import com.maint.pm_backend.repository.SystemJobRepository;
import org.springframework.stereotype.Service;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
public class SystemJobRunnerService {

    private final SystemJobRepository systemJobRepository;
    private final Map<SystemJobCode, SystemJobExecutor> executors;

    public SystemJobRunnerService(SystemJobRepository systemJobRepository, List<SystemJobExecutor> executorList) {
        this.systemJobRepository = systemJobRepository;
        this.executors = new EnumMap<>(SystemJobCode.class);
        executorList.forEach(executor -> this.executors.put(executor.jobCode(), executor));
    }

    public String runJob(SystemJobCode jobCode, SystemJobTriggerType triggerType, Long triggeredByEmployeeId, boolean persist) {
        SystemJob job = systemJobRepository.findByJobCode(jobCode.name())
                .orElseThrow(() -> new IllegalArgumentException("Unknown system job: " + jobCode.name()));

        if (!Boolean.TRUE.equals(job.getActive())) {
            throw new IllegalStateException("System job is inactive: " + jobCode.name());
        }

        SystemJobExecutor executor = executors.get(jobCode);
        if (executor == null) {
            throw new IllegalStateException("No executor registered for job: " + jobCode.name());
        }

        return executor.execute(job, triggerType, triggeredByEmployeeId, persist);
    }
}
