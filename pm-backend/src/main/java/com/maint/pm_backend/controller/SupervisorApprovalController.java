package com.maint.pm_backend.controller;

import com.maint.pm_backend.dto.DeviationTaskProjection;
import com.maint.pm_backend.dto.EmployeeTaskProjection;
import com.maint.pm_backend.dto.EmployeeTaskSummaryDto;
import com.maint.pm_backend.dto.SupervisorApprovalRequest;
import com.maint.pm_backend.dto.SupervisorApprovalResponse;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.service.SupervisorApprovalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

/**
 * REST endpoints for supervisor-specific approval operations.
 * All routes are prefixed with {@code /api/v1/supervisor/approvals}.
 */
@RestController
@RequestMapping("/api/v1/supervisor/approvals")
@RequiredArgsConstructor
public class SupervisorApprovalController {

    private final SupervisorApprovalService supervisorApprovalService;
    private final EmployeeRepository employeeRepository;

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Employee resolveEmployee(Principal principal) {
        if (principal == null) return null;
        return employeeRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new RuntimeException("Logged in user not found"));
    }

    private boolean isAccessDenied(RuntimeException e) {
        return e.getMessage() != null && e.getMessage().startsWith("Access denied");
    }

    // ─── Endpoints ────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/supervisor/approvals/deviations
     *
     * Returns all open task executions with deviation_flag=true that are still
     * in review and whose level-1 approver is the authenticated supervisor.
     */
    @GetMapping("/deviations")
    public ResponseEntity<List<DeviationTaskProjection>> getDeviations(Principal principal) {
        Employee employee = resolveEmployee(principal);
        if (employee == null) return ResponseEntity.status(401).build();
        try {
            return ResponseEntity.ok(
                    supervisorApprovalService.getOpenDeviations(employee.getEmployeeId()));
        } catch (RuntimeException e) {
            if (isAccessDenied(e)) return ResponseEntity.status(403).build();
            throw e;
        }
    }

    /**
     * GET /api/v1/supervisor/approvals/employees/{employeeId}/tasks?period=CURRENT_MONTH
     *
     * Returns all task executions assigned to the given employee that fall under
     * the authenticated supervisor's scope (level-1 approver).
     *
     * @param employeeId the employee whose task list to retrieve
     * @param period the time window to filter tasks by
     */
    @GetMapping("/employees/{employeeId}/tasks")
    public ResponseEntity<List<EmployeeTaskProjection>> getEmployeeTasks(
            @PathVariable Long employeeId,
            @RequestParam(name = "period", required = false, defaultValue = "CURRENT_MONTH") String period,
            Principal principal) {
        Employee supervisor = resolveEmployee(principal);
        if (supervisor == null) return ResponseEntity.status(401).build();
        try {
            return ResponseEntity.ok(
                    supervisorApprovalService.getTasksByEmployee(supervisor.getEmployeeId(), employeeId, period));
        } catch (RuntimeException e) {
            if (isAccessDenied(e)) return ResponseEntity.status(403).build();
            throw e;
        }
    }

    /**
     * GET /api/v1/supervisor/approvals/employees/summary?period=CURRENT_MONTH
     *
     * Returns a list of all employees under this supervisor's scope with full
     * per-status task counts, filtered to the requested time window.
     *
     * <b>period</b> values (case-insensitive, defaults to {@code CURRENT_MONTH}):
     * <ul>
     *   <li>{@code CURRENT_MONTH} – from the 1st of the current month</li>
     *   <li>{@code LAST_2_MONTHS} – from the 1st of 2 months ago</li>
     *   <li>{@code QUARTER}       – from the 1st of 3 months ago</li>
     *   <li>{@code YEAR}          – from the 1st of 12 months ago</li>
     * </ul>
     *
     * Each entry includes:
     * <ul>
     *   <li>totalTasks</li>
     *   <li>assignedOrInProgress</li>
     *   <li>pendingSupervisorApproval</li>
     *   <li>underLineManagerReview</li>
     *   <li>underMaintManagerReview</li>
     *   <li>completedAndClosed</li>
     *   <li>approved</li>
     *   <li>rejected</li>
     * </ul>
     */
    @GetMapping("/employees/summary")
    public ResponseEntity<List<EmployeeTaskSummaryDto>> getEmployeeSummary(
            @RequestParam(name = "period", required = false, defaultValue = "CURRENT_MONTH") String period,
            Principal principal) {
        Employee supervisor = resolveEmployee(principal);
        if (supervisor == null) return ResponseEntity.status(401).build();
        try {
            return ResponseEntity.ok(
                    supervisorApprovalService.getEmployeeSummary(supervisor.getEmployeeId(), period));
        } catch (RuntimeException e) {
            if (isAccessDenied(e)) return ResponseEntity.status(403).build();
            throw e;
        }
    }

    /**
     * POST /api/v1/supervisor/approvals/action
     *
     * Approve or reject a task execution.
     *
     * Request body:
     * <pre>
     * {
     *   "scheduleExecutionId": 130017,
     *   "action": "APPROVE" | "REJECT",
     *   "remarks": "Optional notes"
     * }
     * </pre>
     *
     * <b>APPROVE</b>: activates the next approval level (line manager and, if a level-3
     * row exists, maintenance manager will follow). Sets execution to UNDER_LINE_MANAGER_REVIEW.
     * If supervisor is the final approver, marks the task COMPLETED.
     *
     * <b>REJECT</b>: marks the original execution as REJECTED and creates a new
     * rescheduled execution assigned to the same employee with reschedule_flag=true.
     */
    @PostMapping("/action")
    public ResponseEntity<SupervisorApprovalResponse> processApproval(
            @RequestBody SupervisorApprovalRequest request,
            Principal principal) {
        Employee employee = resolveEmployee(principal);
        if (employee == null) return ResponseEntity.status(401).build();
        try {
            SupervisorApprovalResponse response =
                    supervisorApprovalService.processApproval(request, employee.getEmployeeId());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            if (isAccessDenied(e)) return ResponseEntity.status(403).build();
            throw e;
        }
    }
}
