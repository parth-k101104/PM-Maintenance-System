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

    public SupervisorDashboardResponse getDashboard(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        if (employee.getRoleId() == null || employee.getRoleId() != SUPERVISOR_ROLE_ID) {
            throw new RuntimeException("Access denied: only supervisors can access this dashboard");
        }

        LocalDate today = com.maint.pm_backend.util.DateUtils.getToday();
        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDate monthEnd   = today.withDayOfMonth(today.lengthOfMonth());

        int backlogApprovals  = approvalRepository.countBacklogApprovals(employeeId, today);
        int todaysDue         = approvalRepository.countTodaysDueApprovals(employeeId, today);
        int upcoming          = approvalRepository.countUpcomingApprovalsThisMonth(employeeId, monthStart, monthEnd);
        int activeFlags       = approvalRepository.countActiveFlags(employeeId);
        int openDeviations    = approvalRepository.countOpenDeviations(employeeId);
        int pendingEmpTasks   = approvalRepository.countPendingEmployeeTasks(employeeId);
        int supervised        = approvalRepository.countSupervisedEmployees(employeeId);
        int underLM           = approvalRepository.countApprovedUnderLineManagerReview(employeeId);
        int underMM           = approvalRepository.countApprovedUnderMaintManagerReview(employeeId);
        int tasksInPipeline   = underLM + underMM;

        return SupervisorDashboardResponse.builder()
                .backlogApprovals(backlogApprovals)
                .todaysDueApprovals(todaysDue)
                .upcomingApprovalsThisMonth(upcoming)
                .activeFlags(activeFlags)
                .openDeviations(openDeviations)
                .pendingEmployeeTasks(pendingEmpTasks)
                .supervisedEmployeeCount(supervised)
                .approvedUnderLineManagerReview(underLM)
                .approvedUnderMaintManagerReview(underMM)
                .tasksInPipeline(tasksInPipeline)
                .build();
    }
}
