package io.shiftsync.auth.repository;

import io.shiftsync.auth.domain.LoginAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.UUID;

public interface LoginAttemptRepository extends JpaRepository<LoginAttempt, UUID> {
    
    @Query("SELECT COUNT(l) FROM LoginAttempt l WHERE l.ipAddress = :ipAddress AND l.success = false AND l.attemptedAt >= :since")
    long countFailedAttemptsSince(@Param("ipAddress") String ipAddress, @Param("since") Instant since);
}
