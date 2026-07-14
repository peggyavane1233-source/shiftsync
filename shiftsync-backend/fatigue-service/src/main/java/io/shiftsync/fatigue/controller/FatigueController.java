package io.shiftsync.fatigue.controller;

import io.shiftsync.fatigue.domain.FatigueAlert;
import io.shiftsync.fatigue.domain.FatigueScore;
import io.shiftsync.fatigue.domain.FatigueSelfReport;
import io.shiftsync.fatigue.service.FatigueService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/fatigue")
public class FatigueController {

    private final FatigueService fatigueService;

    public FatigueController(FatigueService fatigueService) {
        this.fatigueService = fatigueService;
    }

    // ========== Worker endpoints ==========

    /** GET /v1/fatigue/me — worker sees their own current score + risk level. */
    @GetMapping("/me")
    public ResponseEntity<FatigueScore> getMyScore(@RequestHeader("X-User-Id") UUID userId) {
        FatigueScore score = fatigueService.getLatestScore(userId);
        if (score == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(score);
    }

    /** POST /v1/fatigue/self-report — worker submits sleep hours + alertness (1-5). */
    @PostMapping("/self-report")
    public ResponseEntity<FatigueSelfReport> submitSelfReport(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestBody SelfReportBody body) {
        FatigueService.SelfReportRequest req = new FatigueService.SelfReportRequest(
                userId, body.shiftId(), body.sleepHours(), body.alertness()
        );
        return ResponseEntity.ok(fatigueService.submitSelfReport(req));
    }

    // ========== Supervisor endpoints ==========

    /** GET /v1/fatigue/users/{id} — supervisor views a worker's score + 30-day trend. */
    @GetMapping("/users/{id}")
    public ResponseEntity<Map<String, Object>> getWorkerScore(@PathVariable UUID id) {
        FatigueScore latest = fatigueService.getLatestScore(id);
        List<FatigueScore> trend = fatigueService.getTrend(id, 30);
        List<FatigueAlert> activeAlerts = fatigueService.getActiveAlerts(id);
        return ResponseEntity.ok(Map.of(
                "latest", latest != null ? latest : Map.of(),
                "trend", trend,
                "activeAlerts", activeAlerts
        ));
    }

    /** GET /v1/fatigue/heatmap?deptId&week — supervisor sees the weekly team heatmap. */
    @GetMapping("/heatmap")
    public ResponseEntity<List<FatigueScore>> getHeatmap(@RequestParam List<UUID> userIds) {
        return ResponseEntity.ok(fatigueService.getHeatmap(userIds));
    }

    /** POST /v1/fatigue/alerts/{id}/override — supervisor overrides a CRITICAL alert. */
    @PostMapping("/alerts/{id}/override")
    public ResponseEntity<FatigueAlert> overrideAlert(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") UUID supervisorId,
            @RequestBody OverrideBody body) {
        return ResponseEntity.ok(fatigueService.overrideAlert(id, supervisorId, body.reason()));
    }

    // ========== Internal endpoint (called by attendance-service) ==========

    /**
     * POST /v1/fatigue/score — internal trigger to recompute a worker's fatigue score.
     * Called by attendance-service after check-in/check-out via OpenFeign.
     * This is the integration point — no Kafka needed.
     */
    @PostMapping("/score")
    public ResponseEntity<FatigueScore> recomputeScore(@RequestBody FatigueService.RecomputeRequest request) {
        return ResponseEntity.ok(fatigueService.recompute(request));
    }

    /**
     * GET /v1/fatigue/{userId}/latest — used by attendance-service Feign client
     * to check if a worker is CRITICAL before allowing check-in.
     */
    @GetMapping("/{userId}/latest")
    public ResponseEntity<LatestScoreResponse> getLatestForService(@PathVariable UUID userId) {
        FatigueScore score = fatigueService.getLatestScore(userId);
        if (score == null) {
            // No score yet = LOW risk (new worker, never computed)
            return ResponseEntity.ok(new LatestScoreResponse(
                    userId, 0, "LOW", ""
            ));
        }
        return ResponseEntity.ok(new LatestScoreResponse(
                score.getUserId(),
                score.getScore(),
                score.getRiskLevel().name(),
                score.getCalculatedAt().toString()
        ));
    }

    // --- Request/Response records ---

    public record SelfReportBody(UUID shiftId, java.math.BigDecimal sleepHours, Integer alertness) {}
    public record OverrideBody(String reason) {}
    public record LatestScoreResponse(UUID userId, int score, String riskLevel, String calculatedAt) {}
}
