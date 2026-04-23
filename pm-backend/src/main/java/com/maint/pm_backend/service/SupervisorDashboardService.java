package com.maint.pm_backend.service;

import com.maint.pm_backend.dto.SupervisorDashboardResponse;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.repository.PmScheduleApprovalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class SupervisorDashboardService {

    private final EmployeeRepository employeeRepository;
    private final PmScheduleApprovalRepository approvalRepository;

    // role_id = 3 → Line Supervisor (access_level 2)
    private static final long SUPERVISOR_ROLE_ID = 3L;

    // Fixed baseline date to match static seed data (Feb 2026)
    private static final LocalDate TODAY = LocalDate.of(2026, 2, 1);

    public SupervisorDashboardResponse getDashboard(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        if (employee.getRoleId() == null || employee.getRoleId() != SUPERVISOR_ROLE_ID) {
            throw new RuntimeException("Access denied: only supervisors can access this dashboard");
        }

        LocalDate monthStart = TODAY.withDayOfMonth(1);
        LocalDate monthEnd   = TODAY.withDayOfMonth(TODAY.lengthOfMonth());

        int todaysDue      = approvalRepository.countTodaysDueApprovals(employeeId, TODAY);
        int openDeviations = approvalRepository.countOpenDeviations(employeeId);
        int upcoming       = approvalRepository.countUpcomingApprovalsThisMonth(employeeId, monthStart, monthEnd);
        int supervised     = approvalRepository.countSupervisedEmployees(employeeId);
        int pipeline       = approvalRepository.countTasksInPipeline(employeeId);

        return SupervisorDashboardResponse.builder()
                .todaysDueApprovals(todaysDue)
                .openDeviations(openDeviations)
                .upcomingApprovalsThisMonth(upcoming)
                .supervisedEmployeeCount(supervised)
                .tasksInPipeline(pipeline)
                .build();
    }
}
