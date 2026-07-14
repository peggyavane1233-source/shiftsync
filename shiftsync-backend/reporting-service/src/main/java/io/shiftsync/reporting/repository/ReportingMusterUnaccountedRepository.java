package io.shiftsync.reporting.repository;

import io.shiftsync.reporting.domain.ReportingMusterUnaccounted;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ReportingMusterUnaccountedRepository extends JpaRepository<ReportingMusterUnaccounted, UUID> {
    List<ReportingMusterUnaccounted> findByMusterId(UUID musterId);
}
