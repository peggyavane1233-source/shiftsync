package io.shiftsync.shift.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.shiftsync.shift.domain.AssignStatus;
import io.shiftsync.shift.domain.OutboxEvent;
import io.shiftsync.shift.domain.Shift;
import io.shiftsync.shift.domain.ShiftAssignment;
import io.shiftsync.shift.domain.ShiftStatus;
import io.shiftsync.shift.exception.IllegalStateTransitionException;
import io.shiftsync.shift.repository.OutboxEventRepository;
import io.shiftsync.shift.repository.ShiftAssignmentRepository;
import io.shiftsync.shift.repository.ShiftRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class ShiftWorkflowService {

    private final ShiftRepository shiftRepository;
    private final ShiftAssignmentRepository assignmentRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    public ShiftWorkflowService(ShiftRepository shiftRepository,
                                ShiftAssignmentRepository assignmentRepository,
                                OutboxEventRepository outboxEventRepository,
                                ObjectMapper objectMapper) {
        this.shiftRepository = shiftRepository;
        this.assignmentRepository = assignmentRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Publishes a shift.
     * Transitions: DRAFT -> PUBLISHED.
     * Atomically writes to outbox.
     */
    @Transactional
    public void publishShift(UUID shiftId, UUID publishedBy) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new IllegalArgumentException("Shift not found"));

        if (shift.getStatus() != ShiftStatus.DRAFT) {
            throw new IllegalStateTransitionException("Cannot publish a shift that is not in DRAFT state. Current state: " + shift.getStatus());
        }

        shift.setStatus(ShiftStatus.PUBLISHED);
        shift.setPublishedAt(Instant.now());
        shiftRepository.save(shift);

        createOutboxEvent(shift.getId(), "Shift", "shift.published", Map.of(
                "shiftId", shift.getId(),
                "departmentId", shift.getDepartmentId(),
                "publishedBy", publishedBy,
                "startTime", shift.getStartTime().toString()
        ));
    }

    /**
     * Cancels a shift.
     * Transitions: DRAFT | PUBLISHED -> CANCELLED
     */
    @Transactional
    public void cancelShift(UUID shiftId, UUID cancelledBy) {
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new IllegalArgumentException("Shift not found"));

        if (shift.getStatus() == ShiftStatus.COMPLETED || shift.getStatus() == ShiftStatus.CANCELLED) {
            throw new IllegalStateTransitionException("Cannot cancel a completed or already cancelled shift.");
        }

        shift.setStatus(ShiftStatus.CANCELLED);
        shiftRepository.save(shift);

        createOutboxEvent(shift.getId(), "Shift", "shift.cancelled", Map.of(
                "shiftId", shift.getId(),
                "cancelledBy", cancelledBy
        ));
    }

    /**
     * Transitions Assignment: ASSIGNED -> CONFIRMED
     */
    @Transactional
    public void confirmAssignment(UUID assignmentId, UUID userId) {
        ShiftAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new IllegalArgumentException("Assignment not found"));

        if (!assignment.getUserId().equals(userId)) {
            throw new IllegalArgumentException("User cannot confirm an assignment belonging to another user.");
        }

        if (assignment.getStatus() != AssignStatus.ASSIGNED) {
            throw new IllegalStateTransitionException("Cannot confirm assignment that is in state: " + assignment.getStatus());
        }

        assignment.setStatus(AssignStatus.CONFIRMED);
        assignment.setConfirmedAt(Instant.now());
        assignmentRepository.save(assignment);
        
        createOutboxEvent(assignment.getId(), "ShiftAssignment", "assignment.confirmed", Map.of(
                "assignmentId", assignment.getId(),
                "userId", userId,
                "shiftId", assignment.getShiftId()
        ));
    }

    private void createOutboxEvent(UUID aggregateId, String aggregateType, String eventType, Map<String, Object> payload) {
        OutboxEvent event = new OutboxEvent();
        event.setId(UUID.randomUUID());
        event.setAggregateId(aggregateId);
        event.setAggregateType(aggregateType);
        event.setEventType(eventType);
        try {
            event.setPayload(objectMapper.writeValueAsString(payload));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize outbox event payload", e);
        }
        outboxEventRepository.save(event);
    }
}
