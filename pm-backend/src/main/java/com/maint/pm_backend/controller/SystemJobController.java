package com.maint.pm_backend.controller;

import com.maint.pm_backend.dto.SystemJobRunRequest;
import com.maint.pm_backend.dto.SystemJobRunResponse;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.entity.enums.SystemJobCode;
import com.maint.pm_backend.entity.enums.SystemJobTriggerType;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.service.SystemJobRunnerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/system-jobs")
public class SystemJobController {

    private final SystemJobRunnerService systemJobRunnerService;
    private final EmployeeRepository employeeRepository;

    public SystemJobController(SystemJobRunnerService systemJobRunnerService, EmployeeRepository employeeRepository) {
        this.systemJobRunnerService = systemJobRunnerService;
        this.employeeRepository = employeeRepository;
    }

    @PostMapping("/{jobCode}/run")
    public ResponseEntity<SystemJobRunResponse> runJob(
            @PathVariable SystemJobCode jobCode,
            @RequestBody(required = false) SystemJobRunRequest request,
            Principal principal
    ) {
        if (principal == null) return ResponseEntity.status(401).build();
        Employee employee = employeeRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));
        SystemJobRunRequest safeRequest = request != null ? request : new SystemJobRunRequest();
        SystemJobTriggerType triggerType = safeRequest.getTriggerType() != null
                ? safeRequest.getTriggerType()
                : SystemJobTriggerType.MANUAL_API;
        boolean persist = safeRequest.getPersist() == null || safeRequest.getPersist();

        String payload = systemJobRunnerService.runJob(
                jobCode,
                triggerType,
                employee.getEmployeeId(),
                persist
        );

        return ResponseEntity.ok(new SystemJobRunResponse(jobCode.name(), "COMPLETED_SUCCESS", payload));
    }
}
