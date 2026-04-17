package com.maint.pm_backend.controller;

import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.service.TaskExecutionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
@RequestMapping("/api/v1/task-execution")
@RequiredArgsConstructor
public class TaskExecutionController {

    private final TaskExecutionService taskExecutionService;
    private final EmployeeRepository employeeRepository;

    @PostMapping("/scan")
    public ResponseEntity<com.maint.pm_backend.dto.QRScanResponse> handleQRScan(
            @RequestBody com.maint.pm_backend.dto.QRScanRequest request, 
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        String email = principal.getName();
        Employee employee = employeeRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

        com.maint.pm_backend.dto.QRScanResponse response = taskExecutionService.handleQRScan(request, employee.getEmployeeId());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/complete")
    public ResponseEntity<com.maint.pm_backend.dto.TaskCompletionResponse> completeTask(
            @RequestBody com.maint.pm_backend.dto.TaskCompletionRequest request,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        String email = principal.getName();
        Employee employee = employeeRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));

        com.maint.pm_backend.dto.TaskCompletionResponse response = taskExecutionService.completeTask(request, employee.getEmployeeId());
        return ResponseEntity.ok(response);
    }
}
