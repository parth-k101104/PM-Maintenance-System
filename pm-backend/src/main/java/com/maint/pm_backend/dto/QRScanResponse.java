package com.maint.pm_backend.dto;

import lombok.Builder;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class QRScanResponse {
    private String status;
    private String message;
    private String uom;
    private List<QRTaskProjection> relatedPartTasks;
    private List<QRTaskProjection> relatedMachineTasks;
}
