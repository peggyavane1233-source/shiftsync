package io.shiftsync.shift.service;

import io.shiftsync.shift.client.FatigueEngineClient;
import io.shiftsync.shift.client.UserServiceClient;
import io.shiftsync.shift.domain.Shift;
import io.shiftsync.shift.exception.ShiftConflictException;
import io.shiftsync.shift.repository.ShiftAssignmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConflictDetectorTest {

    @Mock
    private ShiftAssignmentRepository assignmentRepository;
    @Mock
    private UserServiceClient userServiceClient;
    @Mock
    private FatigueEngineClient fatigueEngineClient;

    private ConflictDetector conflictDetector;
    private final String internalSecret = "test-secret";
    private Shift testShift;
    private UUID userId;
    private UUID certId;

    @BeforeEach
    void setUp() {
        conflictDetector = new ConflictDetector(assignmentRepository, userServiceClient, fatigueEngineClient, internalSecret);
        userId = UUID.randomUUID();
        certId = UUID.randomUUID();
        
        testShift = new Shift();
        testShift.setId(UUID.randomUUID());
        testShift.setStartTime(Instant.now().plus(1, ChronoUnit.DAYS));
        testShift.setEndTime(testShift.getStartTime().plus(8, ChronoUnit.HOURS));
    }

    @Test
    void ruleA_shouldThrowConflictWhenOverlapExists() {
        when(assignmentRepository.hasOverlappingAssignment(userId, testShift.getStartTime(), testShift.getEndTime()))
                .thenReturn(true);

        ShiftConflictException ex = assertThrows(ShiftConflictException.class, 
                () -> conflictDetector.verifyAssignmentAllowed(testShift, userId, false));
        
        assertEquals("SHIFT_CONFLICT", ex.getErrorCode());
    }

    @Test
    void ruleB_shouldThrowConflictWhenInsufficientRest() {
        when(assignmentRepository.hasOverlappingAssignment(any(), any(), any())).thenReturn(false);
        
        // Mock that their last shift ended 5 hours before this one starts (less than 8 hours)
        Instant lastShiftEnd = testShift.getStartTime().minus(5, ChronoUnit.HOURS);
        when(assignmentRepository.findLatestShiftEndTimeBefore(userId, testShift.getStartTime()))
                .thenReturn(Optional.of(lastShiftEnd));

        ShiftConflictException ex = assertThrows(ShiftConflictException.class, 
                () -> conflictDetector.verifyAssignmentAllowed(testShift, userId, false));
        
        assertEquals("INSUFFICIENT_REST", ex.getErrorCode());
    }

    @Test
    void ruleB_shouldPassWhenSufficientRest() {
        when(assignmentRepository.hasOverlappingAssignment(any(), any(), any())).thenReturn(false);
        
        // 10 hours rest (>= 8 hours)
        Instant lastShiftEnd = testShift.getStartTime().minus(10, ChronoUnit.HOURS);
        when(assignmentRepository.findLatestShiftEndTimeBefore(userId, testShift.getStartTime()))
                .thenReturn(Optional.of(lastShiftEnd));
        
        when(fatigueEngineClient.getLatestScore(userId))
                .thenReturn(new FatigueEngineClient.FatigueScoreResponse(userId, 20, "LOW", "time"));

        assertDoesNotThrow(() -> conflictDetector.verifyAssignmentAllowed(testShift, userId, false));
    }

    @Test
    void ruleC_shouldThrowConflictWhenCertMissingOrInvalid() {
        when(assignmentRepository.hasOverlappingAssignment(any(), any(), any())).thenReturn(false);
        when(assignmentRepository.findLatestShiftEndTimeBefore(any(), any())).thenReturn(Optional.empty());
        
        testShift.setRequiredCertId(certId);
        when(userServiceClient.checkCertification(userId, certId, internalSecret))
                .thenReturn(new UserServiceClient.CertificationCheckResponse(false, "EXPIRED"));

        ShiftConflictException ex = assertThrows(ShiftConflictException.class, 
                () -> conflictDetector.verifyAssignmentAllowed(testShift, userId, false));
        
        assertEquals("CERT_MISSING", ex.getErrorCode());
    }
    
    @Test
    void ruleC_shouldThrowConflictWhenCertServiceDown() {
        when(assignmentRepository.hasOverlappingAssignment(any(), any(), any())).thenReturn(false);
        when(assignmentRepository.findLatestShiftEndTimeBefore(any(), any())).thenReturn(Optional.empty());
        
        testShift.setRequiredCertId(certId);
        when(userServiceClient.checkCertification(userId, certId, internalSecret))
                .thenThrow(new RuntimeException("Connection Refused"));

        ShiftConflictException ex = assertThrows(ShiftConflictException.class, 
                () -> conflictDetector.verifyAssignmentAllowed(testShift, userId, false));
        
        assertEquals("CERT_MISSING", ex.getErrorCode());
    }

    @Test
    void ruleD_shouldThrowConflictWhenFatigueCriticalAndNoOverride() {
        when(assignmentRepository.hasOverlappingAssignment(any(), any(), any())).thenReturn(false);
        when(assignmentRepository.findLatestShiftEndTimeBefore(any(), any())).thenReturn(Optional.empty());
        
        when(fatigueEngineClient.getLatestScore(userId))
                .thenReturn(new FatigueEngineClient.FatigueScoreResponse(userId, 95, "CRITICAL", "time"));

        ShiftConflictException ex = assertThrows(ShiftConflictException.class, 
                () -> conflictDetector.verifyAssignmentAllowed(testShift, userId, false));
        
        assertEquals("FATIGUE_CRITICAL", ex.getErrorCode());
    }

    @Test
    void ruleD_shouldPassWhenFatigueCriticalButOverrideTrue() {
        when(assignmentRepository.hasOverlappingAssignment(any(), any(), any())).thenReturn(false);
        when(assignmentRepository.findLatestShiftEndTimeBefore(any(), any())).thenReturn(Optional.empty());
        
        when(fatigueEngineClient.getLatestScore(userId))
                .thenReturn(new FatigueEngineClient.FatigueScoreResponse(userId, 95, "CRITICAL", "time"));

        assertDoesNotThrow(() -> conflictDetector.verifyAssignmentAllowed(testShift, userId, true));
    }
    
    @Test
    void ruleD_shouldThrowConflictWhenFatigueServiceDown() {
        when(assignmentRepository.hasOverlappingAssignment(any(), any(), any())).thenReturn(false);
        when(assignmentRepository.findLatestShiftEndTimeBefore(any(), any())).thenReturn(Optional.empty());
        
        when(fatigueEngineClient.getLatestScore(userId)).thenThrow(new RuntimeException("500 Server Error"));

        ShiftConflictException ex = assertThrows(ShiftConflictException.class, 
                () -> conflictDetector.verifyAssignmentAllowed(testShift, userId, false));
        
        assertEquals("FATIGUE_UNKNOWN", ex.getErrorCode());
    }

    @Test
    void shouldPassWhenAllRulesSatisfied() {
        when(assignmentRepository.hasOverlappingAssignment(any(), any(), any())).thenReturn(false);
        when(assignmentRepository.findLatestShiftEndTimeBefore(any(), any())).thenReturn(Optional.empty());
        
        testShift.setRequiredCertId(certId);
        when(userServiceClient.checkCertification(userId, certId, internalSecret))
                .thenReturn(new UserServiceClient.CertificationCheckResponse(true, "ACTIVE"));
                
        when(fatigueEngineClient.getLatestScore(userId))
                .thenReturn(new FatigueEngineClient.FatigueScoreResponse(userId, 10, "LOW", "time"));

        assertDoesNotThrow(() -> conflictDetector.verifyAssignmentAllowed(testShift, userId, false));
    }
}
