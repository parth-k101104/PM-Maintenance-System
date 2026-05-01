package com.maint.pm_backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "spare_parts")
@Data
public class SparePart {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "plant_id")
    private Long plantId;

    @Column(name = "part_number", length = 100)
    private String partNumber;

    @Column(name = "name", length = 255)
    private String name;

    @Column(name = "category", length = 255)
    private String category;

    @Column(name = "min_stock")
    private Integer minStock;

    @Column(name = "max_stock")
    private Integer maxStock;

    @Column(name = "current_stock")
    private Integer currentStock;

    @Column(name = "cost")
    private BigDecimal cost;

    @Column(name = "location_in_sap", length = 255)
    private String locationInSap;

    @Column(name = "vendor_id")
    private Long vendorId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
