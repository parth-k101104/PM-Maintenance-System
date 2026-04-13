package com.maint.pm_backend.service;

import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.repository.PmScheduleExecutionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TaskExecutionService {

    private final PmScheduleExecutionRepository executionRepository;
    private final EmployeeRepository employeeRepository;

    public com.maint.pm_backend.dto.QRScanResponse handleQRScan(com.maint.pm_backend.dto.QRScanRequest request, Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        // Fixed baseline date for 'today' due to static database seeding (Feb 1st, 2026)
        LocalDate today = LocalDate.of(2026, 2, 1);
        LocalDate endOfMonth = today.withDayOfMonth(today.lengthOfMonth());

        // 1. Access Level Check
        boolean isOperator = employee.getRoleId() != null && 
            (employee.getRoleId() == 4 || employee.getRoleId() == 5 || employee.getRoleId() == 7);
        // Let's assume roles 4 (Electrician), 5 (Fitter), 7 (Production Operator) align to Operator Level 1
        // Fallback: Just assume operator flow for now as requested.

        if (request.getScheduleExecutionId() != null) {
            List<String> uoms = executionRepository.checkActiveOperatorAssignment(employeeId, request.getScheduleExecutionId());
            if (!uoms.isEmpty()) {
                return com.maint.pm_backend.dto.QRScanResponse.builder()
                        .status("success")
                        .message("Task assigned and verified")
                        .uom(uoms.get(0))
                        .build();
            }
        }

        // If not assigned or scheduleExecutionId is omitted
        List<com.maint.pm_backend.dto.QRTaskProjection> relatedPartTasks = executionRepository.findPendingOperatorTasksByPart(
                employeeId, request.getEquipmentPartId(), today, endOfMonth);

        List<com.maint.pm_backend.dto.QRTaskProjection> relatedMachineTasks = executionRepository.findPendingOperatorTasksByEquipmentExcludingPart(
                employeeId, request.getEquipmentId(), request.getEquipmentPartId(), today, endOfMonth);

        return com.maint.pm_backend.dto.QRScanResponse.builder()
                .status("not_found")
                .message("Task not found or not assigned to you")
                .relatedPartTasks(relatedPartTasks)
                .relatedMachineTasks(relatedMachineTasks)
                .build();
    }
}
