package io.shiftsync.shift.controller;

import io.shiftsync.shift.service.SwapService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/swaps")
public class SwapController {

    private final SwapService swapService;

    public SwapController(SwapService swapService) {
        this.swapService = swapService;
    }

    @PostMapping
    public ResponseEntity<?> requestSwap(@RequestHeader("X-User-Id") String userId, 
                                         @RequestBody SwapRequestDto request) {
        var swapReq = swapService.requestSwap(request.shiftId(), UUID.fromString(userId), request.targetUserId(), request.reason());
        return ResponseEntity.ok(swapReq);
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<?> approveSwap(@PathVariable UUID id, @RequestHeader("X-User-Id") String supervisorId) {
        swapService.approveSwap(id, UUID.fromString(supervisorId));
        return ResponseEntity.ok(Map.of("status", "APPROVED"));
    }

    public record SwapRequestDto(UUID shiftId, UUID targetUserId, String reason) {}
}
