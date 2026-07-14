package io.shiftsync.shift.repository;

import io.shiftsync.shift.domain.Shift;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface ShiftRepository extends JpaRepository<Shift, UUID> {
    List<Shift> findByDepartmentIdAndStartTimeBetween(UUID departmentId, Instant start, Instant end);
}
