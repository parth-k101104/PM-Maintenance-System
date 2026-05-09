package com.maint.pm_backend.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class SchedulePlannerContextResponse {
    private List<LineOption> lines;
    private List<LineEquipmentDTO> equipments;
    private List<EmployeeOption> assignableEmployees;
    private List<EmployeeOption> supervisors;
    private List<ApprovalWorkflowOption> approvalWorkflows;
    private List<SparePartOption> spareParts;

    @Data
    @Builder
    public static class LineOption {
        private Long lineId;
        private String lineName;
        private String lineCode;
        private String block;
        private String zone;
    }

    @Data
    @Builder
    public static class EmployeeOption {
        private Long employeeId;
        private String fullName;
        private Long roleId;
        private String roleName;
        private String expertise;
        private BigDecimal performanceScore;
        private BigDecimal availabilityScore;
        private boolean primaryMatch;
    }

    @Data
    @Builder
    public static class ApprovalWorkflowOption {
        private Long workflowId;
        private String workflowName;
        private String description;
    }

    @Data
    @Builder
    public static class SparePartOption {
        private Long sparePartId;
        private String partNumber;
        private String name;
        private String category;
        private Integer currentStock;
    }
}
