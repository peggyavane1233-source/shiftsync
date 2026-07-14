package io.shiftsync.shift.repository;

import io.shiftsync.shift.domain.ShiftSwapRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ShiftSwapRequestRepository extends JpaRepository<ShiftSwapRequest, UUID> {
}
