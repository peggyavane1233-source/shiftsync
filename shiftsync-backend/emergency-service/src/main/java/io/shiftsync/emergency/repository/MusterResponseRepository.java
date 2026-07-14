package io.shiftsync.emergency.repository;

import io.shiftsync.emergency.domain.MusterResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MusterResponseRepository extends JpaRepository<MusterResponse, UUID> {
    List<MusterResponse> findByMusterId(UUID musterId);
    Optional<MusterResponse> findByMusterIdAndUserId(UUID musterId, UUID userId);
}
