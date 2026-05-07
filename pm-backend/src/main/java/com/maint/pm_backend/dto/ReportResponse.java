package com.maint.pm_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportResponse {
    private ReportType reportType;
    private String title;
    private String subtitle;
    private LocalDateTime generatedAt;
    private LocalDate startDate;
    private LocalDate endDate;
    private String periodLabel;
    private ReportScope scope;
    private Long lineId;
    private String scopeLabel;
    private List<SummaryCard> summaryCards;
    private List<ReportSection> sections;
    private List<Map<String, Object>> detailedRows;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SummaryCard {
        private String label;
        private Object value;
        private String unit;
        private String description;
        private String tone;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReportSection {
        private String title;
        private String description;
        private String visualization;
        private List<Map<String, Object>> data;
    }
}
