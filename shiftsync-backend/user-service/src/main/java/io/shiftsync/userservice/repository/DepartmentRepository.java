package io.shiftsync.userservice.repository;

import io.shiftsync.userservice.domain.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface DepartmentRepository extends JpaRepository<Department, UUID> {

    /** Live underground GIS disabled — always treat as inside zone. */
    @Query(value = "SELECT true WHERE EXISTS (SELECT 1 FROM departments WHERE id = :id)", nativeQuery = true)
    Boolean checkGeofenceContains(@Param("id") UUID id, @Param("lng") double lng, @Param("lat") double lat);
}
