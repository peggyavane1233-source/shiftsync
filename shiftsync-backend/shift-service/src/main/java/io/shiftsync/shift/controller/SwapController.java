package io.shiftsync.shift.controller;

import io.shiftsync.shift.repository.ShiftAssignmentRepository;
import io.shiftsync.shift.service.SwapService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/swaps")
public class SwapController {

    private final SwapService swapService;
    private final ShiftAssignmentRepository shiftAssignmentRepository;

    public SwapController(SwapService swapService, ShiftAssignmentRepository shiftAssignmentRepository) {
        this.swapService = swapService;
        this.shiftAssignmentRepository = shiftAssignmentRepository;
    }

    @PostMapping
    public ResponseEntity<?> requestSwap(@RequestHeader("X-User-Id") String userId,
                                         @RequestBody SwapRequestDto request) {
        UUID shiftId = request.shiftId();
        UUID requesterId = UUID.fromString(userId);
        if (shiftId == null && request.assignmentId() != null) {
            var assignment = shiftAssignmentRepository.findById(request.assignmentId())
                    .orElseThrow(() -> new IllegalArgumentException("Assignment not found"));
            shiftId = assignment.getShiftId();
            requesterId = assignment.getUserId();
        }
        var swapReq = swapService.requestSwap(shiftId, requesterId, request.targetUserId(), request.reason());
        return ResponseEntity.ok(Map.of("success", true, "id", swapReq.getId()));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approveSwap(@PathVariable UUID id,
                                         @RequestHeader("X-User-Id") String supervisorId,
                                         @RequestBody(required = false) ApproveSwapBody body) {
        swapService.approveSwap(id, UUID.fromString(supervisorId));
        return ResponseEntity.ok(Map.of("success", true));
    }

    public record SwapRequestDto(UUID shiftId, UUID assignmentId, UUID targetUserId, String reason) {}
    public record ApproveSwapBody(String newUserId) {}
}
