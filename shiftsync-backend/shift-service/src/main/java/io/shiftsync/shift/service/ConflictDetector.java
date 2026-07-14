package io.shiftsync.shift.service;

import io.shiftsync.shift.client.FatigueEngineClient;
import io.shiftsync.shift.client.UserServiceClient;
import io.shiftsync.shift.domain.Shift;
import io.shiftsync.shift.exception.ShiftConflictException;
import io.shiftsync.shift.repository.ShiftAssignmentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class ConflictDetector {

    private final ShiftAssignmentRepository assignmentRepository;
    private final UserServiceClient userServiceClient;
    private final FatigueEngineClient fatigueEngineClient;
    private final String internalSecret;

    public ConflictDetector(
            ShiftAssignmentRepository assignmentRepository,
            UserServiceClient userServiceClient,
            FatigueEngineClient fatigueEngineClient,
            @Value("${app.internal-secret:dev-internal-secret-for-gateway}") String internalSecret) {
        this.assignmentRepository = assignmentRepository;
        this.userServiceClient = userServiceClient;
        this.fatigueEngineClient = fatigueEngineClient;
        this.internalSecret = internalSecret;
    }

    /**
     * Verifies if a user can be assigned to a given shift.
     * Throws ShiftConflictException if any conflict is detected.
     */
    public void verifyAssignmentAllowed(Shift shift, UUID userId, boolean overrideFatigue) {
        
        // 1. OVERLAP: check for overlapping assignments using PG tstzrange
        boolean hasOverlap = assignmentRepository.hasOverlappingAssignment(userId, shift.getStartTime(), shift.getEndTime());
        if (hasOverlap) {
            throw new ShiftConflictException("SHIFT_CONFLICT", "Worker already has an overlapping shift assignment.");
        }

        // 2. REST PERIOD: less than 8 hours since end of last shift
        Optional<Instant> lastShiftEndOpt = assignmentRepository.findLatestShiftEndTimeBefore(userId, shift.getStartTime());
        if (lastShiftEndOpt.isPresent()) {
            Instant lastShiftEnd = lastShiftEndOpt.get();
            long hoursBetween = Duration.between(lastShiftEnd, shift.getStartTime()).toHours();
            if (hoursBetween < 8) {
                throw new ShiftConflictException("INSUFFICIENT_REST", "Worker has had less than 8 hours of rest since their last shift.");
            }
        }

        // 3. CERTIFICATION: required cert missing or expired
        if (shift.getRequiredCertId() != null) {
            try {
                var certResponse = userServiceClient.checkCertification(userId, shift.getRequiredCertId(), internalSecret);
                if (!certResponse.isValid()) {
                    throw new ShiftConflictException("CERT_MISSING", "Worker lacks the required active certification.");
                }
            } catch (Exception e) {
                // If service is down or returns 404, default to deny for safety
                throw new ShiftConflictException("CERT_MISSING", "Could not verify certification status: " + e.getMessage());
            }
        }

        // 4. FATIGUE: risk_level is CRITICAL
        try {
            var fatigueResponse = fatigueEngineClient.getLatestScore(userId);
            if ("CRITICAL".equalsIgnoreCase(fatigueResponse.riskLevel())) {
                if (!overrideFatigue) {
                    throw new ShiftConflictException("FATIGUE_CRITICAL", "Worker fatigue level is CRITICAL. Assignment requires override.");
                }
            }
        } catch (Exception e) {
            // Depending on strictness, we might deny if we can't reach the fatigue engine.
            // For MVP, we deny on failure to ensure safety.
            throw new ShiftConflictException("FATIGUE_UNKNOWN", "Could not verify fatigue score: " + e.getMessage());
        }
    }
}
