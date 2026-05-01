package com.maint.pm_backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class LineEquipmentDTO {
    private Long equipmentId;
    private String equipmentName;
    private List<LineElementDTO> elements;
}
