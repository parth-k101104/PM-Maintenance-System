package com.maint.pm_backend.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class CreatePmScheduleRequest {
    private String taskRefNo;
    private Long elementId;
    private Long partId;
    private Long sparePartId;
    private String taskCriticality;
    private String maintenanceStrategy;
    private String method;
    private List<String> tools;
    private Long assigneeRoleId;
    private Long assigneeEmployeeId;
    private Long supervisorId;
    private Integer estimatedReqTime;
    private String mode;
    private String frequency;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer occurrences;
    private BigDecimal standardValue;
    private BigDecimal toleranceMin;
    private BigDecimal toleranceMax;
    private String uom;
    private Long approvalWorkflowId;
}
