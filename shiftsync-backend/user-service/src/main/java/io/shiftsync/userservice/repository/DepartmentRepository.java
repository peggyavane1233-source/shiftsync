package io.shiftsync.userservice.repository;

import io.shiftsync.userservice.domain.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface DepartmentRepository extends JpaRepository<Department, UUID> {
    
    @Query(value = "SELECT ST_Contains(geofence, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)) FROM departments WHERE id = :id", nativeQuery = true)
    Boolean checkGeofenceContains(@Param("id") UUID id, @Param("lng") double lng, @Param("lat") double lat);
}
