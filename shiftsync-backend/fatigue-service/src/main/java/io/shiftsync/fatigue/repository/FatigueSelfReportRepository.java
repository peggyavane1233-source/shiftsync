package io.shiftsync.fatigue.repository;

import io.shiftsync.fatigue.domain.FatigueSelfReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface FatigueSelfReportRepository extends JpaRepository<FatigueSelfReport, UUID> {

    /** Most recent self-report for a worker — feeds into the scoring model. */
    Optional<FatigueSelfReport> findFirstByUserIdOrderByReportedAtDesc(UUID userId);
}
