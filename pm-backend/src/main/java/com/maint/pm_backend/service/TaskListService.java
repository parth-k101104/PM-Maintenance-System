package com.maint.pm_backend.service;

import com.maint.pm_backend.dto.TaskDetailsProjection;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.repository.PmScheduleExecutionRepository;
import com.maint.pm_backend.repository.PmScheduleApprovalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TaskListService {

    private final PmScheduleExecutionRepository executionRepository;
    private final PmScheduleApprovalRepository approvalRepository;
    private final EmployeeRepository employeeRepository;

    public List<TaskDetailsProjection> getTasksForToday(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        // Using a fixed static date due to database seed values mapping dynamically 
        LocalDate mockToday = com.maint.pm_backend.util.DateUtils.getToday();
        return executionRepository.findTasksForTodayNative(employeeId, mockToday);
    }

    public List<com.maint.pm_backend.dto.TaskDetailsProjection> getUpcomingTasks(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        LocalDate mockToday = com.maint.pm_backend.util.DateUtils.getToday();
        LocalDate endOfMonth = mockToday.withDayOfMonth(mockToday.lengthOfMonth());
        
        // If supervisor, return their upcoming approvals instead of personal tasks
        if (employee.getRoleId() != null && employee.getRoleId() == 3L) {
            LocalDate monthStart = mockToday.withDayOfMonth(1);
            return approvalRepository.findUpcomingApprovalsList(employeeId, monthStart, endOfMonth, mockToday);
        }

        return executionRepository.findUpcomingTasksNative(employeeId, mockToday, endOfMonth);
    }

    public List<com.maint.pm_backend.dto.TaskDetailsProjection> getBacklogTasks(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        LocalDate mockToday = com.maint.pm_backend.util.DateUtils.getToday();
        return executionRepository.findBacklogTasksNative(employeeId, mockToday);
    }

    public List<com.maint.pm_backend.dto.CompletedTaskProjection> getCompletedTasks(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        return executionRepository.findCompletedTasksNative(employeeId);
    }

    public List<com.maint.pm_backend.dto.TaskDetailsProjection> getSupervisorTodaysApprovals(Long supervisorId) {
        Employee employee = employeeRepository.findById(supervisorId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        if (employee.getRoleId() == null || employee.getRoleId() != 3L) {
            throw new RuntimeException("Access denied: only supervisors can access this");
        }

        LocalDate mockToday = com.maint.pm_backend.util.DateUtils.getToday();
        return approvalRepository.findTodaysDueApprovalsList(supervisorId, mockToday);
    }

}
