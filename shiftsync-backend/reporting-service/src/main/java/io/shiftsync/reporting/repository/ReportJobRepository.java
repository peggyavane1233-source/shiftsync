package io.shiftsync.reporting.repository;

import io.shiftsync.reporting.domain.ReportJob;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ReportJobRepository extends JpaRepository<ReportJob, UUID> {
}
