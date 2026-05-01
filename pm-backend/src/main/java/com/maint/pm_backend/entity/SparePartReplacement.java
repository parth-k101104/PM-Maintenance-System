package com.maint.pm_backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "spare_part_replacements")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SparePartReplacement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "part_id")
    private Long partId; // Referencing equipment_parts(part_id)

    @Column(name = "spare_part_id")
    private Long sparePartId; // Referencing spare_parts(id)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "replaced_by")
    private Employee replacedBy;

    @Column(name = "replacement_dttm")
    private LocalDateTime replacementDttm;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
