package com.maint.pm_backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class LineElementDTO {
    private Long elementId;
    private String elementName;
    private List<LinePartDTO> parts;
}
