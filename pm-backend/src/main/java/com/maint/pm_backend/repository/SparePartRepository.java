package com.maint.pm_backend.repository;

import com.maint.pm_backend.entity.SparePart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SparePartRepository extends JpaRepository<SparePart, Long> {
    /** Find spare parts that belong to the same plant as the part being replaced. */
    List<SparePart> findByPlantId(Long plantId);
}
