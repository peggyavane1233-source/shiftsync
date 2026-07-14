package io.shiftsync.emergency.controller;

import io.shiftsync.emergency.domain.EmergencyMuster;
import io.shiftsync.emergency.domain.MusterResponse;
import io.shiftsync.emergency.service.MusterService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/v1/musters")
public class MusterController {

    private final MusterService musterService;

    public MusterController(MusterService musterService) {
        this.musterService = musterService;
    }

    @PostMapping
    public ResponseEntity<EmergencyMuster> initiateMuster(
            @RequestHeader("X-User-Id") UUID initiatorId,
            @RequestBody InitiateRequest request) {
        return ResponseEntity.ok(musterService.initiateMuster(request.zone(), initiatorId));
    }

    @PostMapping("/{id}/respond")
    public ResponseEntity<MusterResponse> respondToMuster(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") UUID userId) {
        return ResponseEntity.ok(musterService.respond(id, userId, null));
    }

    @PostMapping("/{id}/mark")
    public ResponseEntity<MusterResponse> markWorkerSafe(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") UUID supervisorId,
            @RequestBody MarkSafeRequest request) {
        return ResponseEntity.ok(musterService.respond(id, request.userId(), supervisorId));
    }

    @PostMapping("/{id}/close")
    public ResponseEntity<EmergencyMuster> closeMuster(@PathVariable UUID id) {
        return ResponseEntity.ok(musterService.closeMuster(id));
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<EmergencyMuster> getMuster(@PathVariable UUID id) {
        EmergencyMuster m = musterService.getMuster(id);
        if (m == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(m);
    }

    public record InitiateRequest(UUID zone) {}
    public record MarkSafeRequest(UUID userId) {}
}
