package io.shiftsync.attendance.repository;

import io.shiftsync.attendance.domain.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, UUID> {
    Optional<AttendanceRecord> findByClientUuid(UUID clientUuid);
    Optional<AttendanceRecord> findByUserIdAndShiftId(UUID userId, UUID shiftId);
    
    @org.springframework.data.jpa.repository.Query("SELECT r.userId FROM AttendanceRecord r WHERE r.departmentId = :departmentId AND r.checkOutTime IS NULL")
    java.util.List<UUID> findActiveWorkersByDepartmentId(@org.springframework.data.repository.query.Param("departmentId") UUID departmentId);
}
