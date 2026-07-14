package io.shiftsync.reporting.repository;

import io.shiftsync.reporting.domain.ReportingMuster;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface ReportingMusterRepository extends JpaRepository<ReportingMuster, UUID> {
    List<ReportingMuster> findByInitiatedAtBetween(Instant start, Instant end);
}
