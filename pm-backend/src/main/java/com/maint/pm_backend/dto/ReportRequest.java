package com.maint.pm_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportRequest {
    private ReportType reportType;
    private ReportScope scope;
    private Long lineId;
    private ReportPeriod period;
    private Integer quarter;
    private Integer half;
    private LocalDate customStartDate;
    private LocalDate customEndDate;
    private ReportFormat format;
}
