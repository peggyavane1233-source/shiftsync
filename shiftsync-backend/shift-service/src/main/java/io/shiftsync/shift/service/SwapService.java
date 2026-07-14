package io.shiftsync.shift.service;

import io.shiftsync.shift.domain.AssignStatus;
import io.shiftsync.shift.domain.Shift;
import io.shiftsync.shift.domain.ShiftAssignment;
import io.shiftsync.shift.domain.ShiftSwapRequest;
import io.shiftsync.shift.exception.IllegalStateTransitionException;
import io.shiftsync.shift.exception.ShiftConflictException;
import io.shiftsync.shift.repository.ShiftAssignmentRepository;
import io.shiftsync.shift.repository.ShiftRepository;
import io.shiftsync.shift.repository.ShiftSwapRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class SwapService {

    private final ShiftSwapRequestRepository swapRequestRepository;
    private final ShiftAssignmentRepository assignmentRepository;
    private final ShiftRepository shiftRepository;
    private final ConflictDetector conflictDetector;
    private final ShiftWorkflowService workflowService;

    public SwapService(ShiftSwapRequestRepository swapRequestRepository,
                       ShiftAssignmentRepository assignmentRepository,
                       ShiftRepository shiftRepository,
                       ConflictDetector conflictDetector,
                       ShiftWorkflowService workflowService) {
        this.swapRequestRepository = swapRequestRepository;
        this.assignmentRepository = assignmentRepository;
        this.shiftRepository = shiftRepository;
        this.conflictDetector = conflictDetector;
        this.workflowService = workflowService;
    }

    @Transactional
    public ShiftSwapRequest requestSwap(UUID shiftId, UUID requesterId, UUID targetUserId, String reason) {
        // Ensure requester owns the assignment
        ShiftAssignment assignment = assignmentRepository.findByShiftId(shiftId).stream()
                .filter(a -> a.getUserId().equals(requesterId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Requester does not have an assignment for this shift"));

        if (assignment.getStatus() != AssignStatus.CONFIRMED && assignment.getStatus() != AssignStatus.ASSIGNED) {
            throw new IllegalStateTransitionException("Cannot request swap for assignment in state: " + assignment.getStatus());
        }

        assignment.setStatus(AssignStatus.SWAP_PENDING);
        assignmentRepository.save(assignment);

        ShiftSwapRequest request = new ShiftSwapRequest();
        request.setId(UUID.randomUUID());
        request.setShiftId(shiftId);
        request.setRequesterId(requesterId);
        request.setTargetUserId(targetUserId);
        request.setReason(reason);
        
        return swapRequestRepository.save(request);
    }

    @Transactional
    public void approveSwap(UUID swapRequestId, UUID supervisorId) {
        ShiftSwapRequest request = swapRequestRepository.findById(swapRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Swap request not found"));
                
        if (!"PENDING".equals(request.getStatus())) {
            throw new IllegalStateTransitionException("Swap request is not PENDING");
        }

        Shift shift = shiftRepository.findById(request.getShiftId())
                .orElseThrow(() -> new IllegalArgumentException("Shift not found"));

        // Find requester's assignment
        ShiftAssignment requesterAssignment = assignmentRepository.findByShiftId(shift.getId()).stream()
                .filter(a -> a.getUserId().equals(request.getRequesterId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Original assignment missing"));

        // Pre-check conflicts for the target user (Throws exception on failure, rolling back transaction)
        try {
            conflictDetector.verifyAssignmentAllowed(shift, request.getTargetUserId(), false);
        } catch (ShiftConflictException e) {
            // "A swap that would create a conflict is rejected, not approved-then-broken"
            request.setStatus("REJECTED");
            request.setResolvedBy(supervisorId);
            request.setResolvedAt(Instant.now());
            request.setReason("Rejected due to conflict for target user: " + e.getErrorCode());
            swapRequestRepository.save(request);
            
            // Revert requester's status
            requesterAssignment.setStatus(AssignStatus.CONFIRMED);
            assignmentRepository.save(requesterAssignment);
            
            throw e; // Bubble up so the caller knows it failed
        }

        // Reassign atomically
        requesterAssignment.setStatus(AssignStatus.SWAPPED);
        assignmentRepository.save(requesterAssignment);

        ShiftAssignment newAssignment = new ShiftAssignment();
        newAssignment.setId(UUID.randomUUID());
        newAssignment.setShiftId(shift.getId());
        newAssignment.setUserId(request.getTargetUserId());
        newAssignment.setStatus(AssignStatus.ASSIGNED);
        assignmentRepository.save(newAssignment);

        request.setStatus("APPROVED");
        request.setResolvedBy(supervisorId);
        request.setResolvedAt(Instant.now());
        swapRequestRepository.save(request);

        // We could also emit an outbox event for swap.approved here, but let's assume
        // the requester/target notification will be handled.
    }
}
