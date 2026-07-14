package io.shiftsync.reporting.repository;

import io.shiftsync.reporting.domain.ReportingFatigueIncident;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface ReportingFatigueIncidentRepository extends JpaRepository<ReportingFatigueIncident, UUID> {
    List<ReportingFatigueIncident> findByAlertTimeBetween(Instant start, Instant end);
}
