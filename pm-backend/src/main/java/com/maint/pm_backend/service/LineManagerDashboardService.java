package com.maint.pm_backend.service;

import com.maint.pm_backend.dto.LineManagerDashboardResponse;
import com.maint.pm_backend.dto.TaskDetailsProjection;
import com.maint.pm_backend.entity.Employee;
import com.maint.pm_backend.repository.EmployeeRepository;
import com.maint.pm_backend.repository.PmScheduleApprovalRepository;
import com.maint.pm_backend.repository.PmScheduleExecutionRepository;
import lombok.RequiredArgsConstructor;
import com.maint.pm_backend.dto.EquipmentHierarchyProjection;
import com.maint.pm_backend.dto.LineEquipmentDTO;
import com.maint.pm_backend.dto.LineElementDTO;
import com.maint.pm_backend.dto.LinePartDTO;
import com.maint.pm_backend.dto.IssueFlagProjection;
import com.maint.pm_backend.repository.IssueFlagRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class LineManagerDashboardService {

    private final EmployeeRepository employeeRepository;
    private final PmScheduleApprovalRepository approvalRepository;
    private final PmScheduleExecutionRepository executionRepository;
    private final IssueFlagRepository issueFlagRepository;

    // role_id = 2 -> Line Manager
    private static final long LINE_MANAGER_ROLE_ID = 2L;

    // Use centralized DateUtils instead of hardcoded baseline date
    private static final LocalDate TODAY = com.maint.pm_backend.util.DateUtils.getToday();

    public LineManagerDashboardResponse getDashboard(Long employeeId) {
        validateLineManager(employeeId);

        int totalApprovalsToday = approvalRepository.countTodaysApprovalsForLineManager(employeeId);
        int backlogApprovals = approvalRepository.countBacklogApprovalsForLineManager(employeeId, TODAY);
        
        int totalMachines = executionRepository.countTotalMachinesForLineManager(employeeId);
        int unhealthyMachines = executionRepository.countUnhealthyMachinesForLineManager(employeeId);
        Double lineHealth = 100.0;
        if (totalMachines > 0) {
            lineHealth = (1.0 - ((double) unhealthyMachines / totalMachines)) * 100.0;
        }

        int totalFlagsRaised = executionRepository.countActiveFlagsForLineManager(employeeId);
        int activeTasksToday = executionRepository.countActiveTasksForLineManager(employeeId);
        int pendingReviewTasks = executionRepository.countPendingReviewTasksForLineManager(employeeId);
        int rejectedTasks = executionRepository.countRejectedTasksForLineManager(employeeId);
        
        LineManagerDashboardResponse response = new LineManagerDashboardResponse();
        response.setTotalApprovalsToday(totalApprovalsToday);
        response.setBacklogApprovals(backlogApprovals);
        response.setLineHealth(lineHealth);
        response.setTotalFlagsRaised(totalFlagsRaised);
        response.setActiveTasksToday(activeTasksToday);
        response.setPendingReviewTasks(pendingReviewTasks);
        response.setRejectedTasks(rejectedTasks);

        return response;
    }

    public List<TaskDetailsProjection> getTodaysApprovalsList(Long employeeId) {
        validateLineManager(employeeId);
        return approvalRepository.findTodaysApprovalsListForLineManager(employeeId);
    }

    public List<TaskDetailsProjection> getBacklogApprovalsList(Long employeeId) {
        validateLineManager(employeeId);
        return approvalRepository.findBacklogApprovalsListForLineManager(employeeId, TODAY);
    }

    public List<TaskDetailsProjection> getActiveTasksList(Long employeeId) {
        validateLineManager(employeeId);
        return executionRepository.findActiveTasksListForLineManager(employeeId);
    }

    public List<IssueFlagProjection> getFlagsList(Long employeeId) {
        validateLineManager(employeeId);
        return issueFlagRepository.findFlagsByLineManagerId(employeeId);
    }

    public List<LineEquipmentDTO> getEquipmentHierarchy(Long employeeId) {
        validateLineManager(employeeId);
        List<EquipmentHierarchyProjection> projections = executionRepository.findEquipmentHierarchyForLineManager(employeeId);
        
        Map<Long, LineEquipmentDTO> equipmentMap = new LinkedHashMap<>();
        
        for (EquipmentHierarchyProjection p : projections) {
            Long eqId = p.getEquipmentId();
            if (eqId == null) continue;
            
            LineEquipmentDTO eqDto = equipmentMap.computeIfAbsent(eqId, id -> {
                LineEquipmentDTO dto = new LineEquipmentDTO();
                dto.setEquipmentId(id);
                dto.setEquipmentName(p.getEquipmentName());
                dto.setElements(new ArrayList<>());
                return dto;
            });
            
            Long elId = p.getElementId();
            if (elId != null) {
                LineElementDTO elDto = eqDto.getElements().stream()
                        .filter(e -> e.getElementId().equals(elId))
                        .findFirst()
                        .orElseGet(() -> {
                            LineElementDTO dto = new LineElementDTO();
                            dto.setElementId(elId);
                            dto.setElementName(p.getElementName());
                            dto.setParts(new ArrayList<>());
                            eqDto.getElements().add(dto);
                            return dto;
                        });
                
                Long partId = p.getPartId();
                if (partId != null) {
                    boolean partExists = elDto.getParts().stream().anyMatch(pt -> pt.getPartId().equals(partId));
                    if (!partExists) {
                        LinePartDTO partDto = new LinePartDTO();
                        partDto.setPartId(partId);
                        partDto.setPartName(p.getPartName());
                        elDto.getParts().add(partDto);
                    }
                }
            }
        }
        
        return new ArrayList<>(equipmentMap.values());
    }

    private void validateLineManager(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        if (employee.getRoleId() == null || employee.getRoleId() != LINE_MANAGER_ROLE_ID) {
            throw new RuntimeException("Access denied: only line managers can access this endpoint");
        }
    }
}
