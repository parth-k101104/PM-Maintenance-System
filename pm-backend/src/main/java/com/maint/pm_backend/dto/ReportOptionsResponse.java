package com.maint.pm_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportOptionsResponse {
    private List<Option> reportTypes;
    private List<Option> scopes;
    private List<Option> periods;
    private List<Option> formats;
    private List<LineOption> lines;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Option {
        private String value;
        private String label;
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LineOption {
        private Long lineId;
        private String lineName;
        private String lineCode;
    }
}
