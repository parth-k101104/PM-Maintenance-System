package com.maint.pm_backend.repository;

import com.maint.pm_backend.entity.PmScheduleExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PmScheduleExecutionRepository extends JpaRepository<PmScheduleExecution, Long> {

    @Query("SELECT e FROM PmScheduleExecution e " +
           "JOIN FETCH e.taskSchedule ts " +
           "JOIN FETCH ts.stdTask " +
           "WHERE e.employee.employeeId = :employeeId")
    List<PmScheduleExecution> findAllByEmployeeIdWithDetails(@Param("employeeId") Long employeeId);
}
