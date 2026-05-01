package com.maint.pm_backend.repository;

import com.maint.pm_backend.entity.SparePartReplacement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SparePartReplacementRepository extends JpaRepository<SparePartReplacement, Long> {
}
