package io.shiftsync.fatigue.repository;

import io.shiftsync.fatigue.domain.FatigueAlert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FatigueAlertRepository extends JpaRepository<FatigueAlert, UUID> {

    /** Active unresolved alerts for a worker. */
    List<FatigueAlert> findByUserIdAndResolvedAtIsNullOrderByTriggeredAtDesc(UUID userId);

    /** Specific unresolved alert by ID — for override endpoint. */
    Optional<FatigueAlert> findByIdAndResolvedAtIsNull(UUID id);
}
