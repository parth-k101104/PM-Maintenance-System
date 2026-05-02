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

    // Use centralized DateUtils instead of hardcoded baseline date
    private static final LocalDate TODAY = com.maint.pm_backend.util.DateUtils.getToday();

    public SupervisorDashboardResponse getDashboard(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        if (employee.getRoleId() == null || employee.getRoleId() != SUPERVISOR_ROLE_ID) {
            throw new RuntimeException("Access denied: only supervisors can access this dashboard");
        }

        LocalDate monthStart = TODAY.withDayOfMonth(1);
        LocalDate monthEnd   = TODAY.withDayOfMonth(TODAY.lengthOfMonth());

        int backlogApprovals  = approvalRepository.countBacklogApprovals(employeeId, TODAY);
        int todaysDue         = approvalRepository.countTodaysDueApprovals(employeeId, TODAY);
        int upcoming          = approvalRepository.countUpcomingApprovalsThisMonth(employeeId, monthStart, monthEnd);
        int activeFlags       = approvalRepository.countActiveFlags(employeeId);
        int pendingEmpTasks   = approvalRepository.countPendingEmployeeTasks(employeeId);
        int supervised        = approvalRepository.countSupervisedEmployees(employeeId);
        int underLM           = approvalRepository.countApprovedUnderLineManagerReview(employeeId);
        int underMM           = approvalRepository.countApprovedUnderMaintManagerReview(employeeId);

        return SupervisorDashboardResponse.builder()
                .backlogApprovals(backlogApprovals)
                .todaysDueApprovals(todaysDue)
                .upcomingApprovalsThisMonth(upcoming)
                .activeFlags(activeFlags)
                .pendingEmployeeTasks(pendingEmpTasks)
                .supervisedEmployeeCount(supervised)
                .approvedUnderLineManagerReview(underLM)
                .approvedUnderMaintManagerReview(underMM)
                .build();
    }
}
