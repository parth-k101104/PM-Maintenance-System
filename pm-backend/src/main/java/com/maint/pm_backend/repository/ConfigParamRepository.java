package com.maint.pm_backend.repository;

import com.maint.pm_backend.entity.ConfigParam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConfigParamRepository extends JpaRepository<ConfigParam, Long> {

    /** Load a single active param by its business key. */
    Optional<ConfigParam> findByParamKeyAndIsActiveTrue(String paramKey);

    /** Load a single param by its business key regardless of active flag. */
    Optional<ConfigParam> findByParamKey(String paramKey);

    /** Load all active params — called on cache refresh. */
    List<ConfigParam> findAllByIsActiveTrue();

    /** Load all params in a category (active or inactive). */
    List<ConfigParam> findAllByParamCategory(String paramCategory);
}
