package io.shiftsync.emergency.repository;

import io.shiftsync.emergency.domain.EmergencyMuster;
import io.shiftsync.emergency.domain.MusterStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EmergencyMusterRepository extends JpaRepository<EmergencyMuster, UUID> {
    List<EmergencyMuster> findByZoneAndStatus(UUID zone, MusterStatus status);
    Optional<EmergencyMuster> findByIdAndStatus(UUID id, MusterStatus status);
}
