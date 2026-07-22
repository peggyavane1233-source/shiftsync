package io.shiftsync.fatigue.service;

import io.shiftsync.fatigue.domain.FatigueAlert;
import io.shiftsync.fatigue.domain.FatigueScore;
import io.shiftsync.fatigue.domain.FatigueSelfReport;
import io.shiftsync.fatigue.domain.RiskLevel;
import io.shiftsync.fatigue.repository.FatigueAlertRepository;
import io.shiftsync.fatigue.repository.FatigueScoreRepository;
import io.shiftsync.fatigue.repository.FatigueSelfReportRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class FatigueService {

    private final FatigueScoreRepository scoreRepository;
    private final FatigueAlertRepository alertRepository;
    private final FatigueSelfReportRepository selfReportRepository;
    private final FatigueScoringEngine scoringEngine;
    private final String modelVersion;

    public FatigueService(FatigueScoreRepository scoreRepository,
                          FatigueAlertRepository alertRepository,
                          FatigueSelfReportRepository selfReportRepository,
                          FatigueScoringEngine scoringEngine,
                          @Value("${app.fatigue.model-version:1.0.0}") String modelVersion) {
        this.scoreRepository = scoreRepository;
        this.alertRepository = alertRepository;
        this.selfReportRepository = selfReportRepository;
        this.scoringEngine = scoringEngine;
        this.modelVersion = modelVersion;
    }

    /**
     * Recompute fatigue score for a worker.
     * Called internally after check-in/check-out events via HTTP from attendance-service.
     * 
     * The inputs (hours worked, night shifts, consecutive days) are passed by the caller
     * which aggregates them from attendance records. This keeps the fatigue-service
     * stateless with respect to attendance data — it never reads another service's tables.
     */
    @Transactional
    public FatigueScore recompute(RecomputeRequest request) {
        // Grab the latest self-report if available — model degrades gracefully without it
        BigDecimal sleepHours = selfReportRepository
                .findFirstByUserIdOrderByReportedAtDesc(request.userId())
                .map(FatigueSelfReport::getSleepHours)
                .orElse(null);

        FatigueScoringEngine.FatigueInputs inputs = new FatigueScoringEngine.FatigueInputs(
                request.hoursWorked24h(),
                request.hoursWorked7d(),
                request.nightShifts7d(),
                request.consecutiveDays(),
                sleepHours
        );

        FatigueScoringEngine.ScoringResult result = scoringEngine.calculate(inputs);

        // Persist score (append-only)
        FatigueScore score = new FatigueScore();
        score.setId(UUID.randomUUID());
        score.setUserId(request.userId());
        score.setCalculatedAt(Instant.now());
        score.setHoursWorked24h(request.hoursWorked24h());
        score.setHoursWorked7d(request.hoursWorked7d());
        score.setNightShifts7d(request.nightShifts7d());
        score.setConsecutiveDays(request.consecutiveDays());
        score.setSelfReportScore(sleepHours != null ? sleepHours.intValue() : null);
        score.setScore(result.score());
        score.setRiskLevel(result.riskLevel());
        score.setModelVersion(modelVersion);

        scoreRepository.save(score);

        // If WARNING or CRITICAL, create an alert
        if (result.riskLevel() == RiskLevel.WARNING || result.riskLevel() == RiskLevel.CRITICAL) {
            FatigueAlert alert = new FatigueAlert();
            alert.setId(UUID.randomUUID());
            alert.setUserId(request.userId());
            alert.setScoreId(score.getId());
            alert.setAlertLevel(result.riskLevel());
            alert.setTriggeredAt(Instant.now());
            alertRepository.save(alert);
        }

        return score;
    }

    /** Get the latest score for a worker — used by attendance-service Feign client. */
    public FatigueScore getLatestScore(UUID userId) {
        return scoreRepository.findFirstByUserIdOrderByCalculatedAtDesc(userId)
                .orElse(null);
    }

    /** 30-day trend for supervisor view. */
    public List<FatigueScore> getTrend(UUID userId, int days) {
        Instant since = Instant.now().minusSeconds((long) days * 86400);
        return scoreRepository.findByUserIdAndCalculatedAtAfterOrderByCalculatedAtDesc(userId, since);
    }

    /** Heatmap: latest scores for a list of workers. */
    public List<FatigueScore> getHeatmap(List<UUID> userIds) {
        return scoreRepository.findLatestScoresForUsers(userIds);
    }

    /** Submit a self-report (sleep hours + alertness). */
    @Transactional
    public FatigueSelfReport submitSelfReport(SelfReportRequest request) {
        FatigueSelfReport report = new FatigueSelfReport();
        report.setId(UUID.randomUUID());
        report.setUserId(request.userId());
        report.setShiftId(request.shiftId());
        report.setSleepHours(request.sleepHours());
        report.setAlertness(request.alertness());
        report.setReportedAt(Instant.now());
        return selfReportRepository.save(report);
    }

    /**
     * Override a CRITICAL alert. Requires a reason ≥ 20 characters.
     * This is the artifact a regulator will ask for.
     */
    @Transactional
    public FatigueAlert overrideAlert(UUID alertId, UUID supervisorId, String reason) {
        if (reason == null || reason.trim().length() < 20) {
            throw new IllegalArgumentException("Override reason must be at least 20 characters");
        }

        FatigueAlert alert = alertRepository.findByIdAndResolvedAtIsNull(alertId)
                .orElseThrow(() -> new IllegalArgumentException("Alert not found or already resolved"));

        alert.setAcknowledgedBy(supervisorId);
        alert.setAcknowledgedAt(Instant.now());
        alert.setOverrideReason(reason.trim());
        alert.setResolvedAt(Instant.now());

        return alertRepository.save(alert);
    }

    /** Get active (unresolved) alerts for a worker. */
    public List<FatigueAlert> getActiveAlerts(UUID userId) {
        return alertRepository.findByUserIdAndResolvedAtIsNullOrderByTriggeredAtDesc(userId);
    }

    /** Latest scores at WARNING/CRITICAL — mock contract for supervisor alert list. */
    public List<FatigueScore> listSupervisorAlerts() {
        return scoreRepository.findLatestByRiskLevels();
    }

    /** Override by worker id — mock contract POST /v1/fatigue/{userId}/override */
    @Transactional
    public FatigueAlert overrideAlertForUser(UUID userId, UUID supervisorId, String reason) {
        FatigueAlert alert = alertRepository
                .findFirstByUserIdAndResolvedAtIsNullOrderByTriggeredAtDesc(userId)
                .orElseThrow(() -> new IllegalArgumentException("No active alert for worker"));
        return overrideAlert(alert.getId(), supervisorId, reason);
    }

    /** Enriched worker view — mock contract for GET /v1/fatigue/me */
    public Map<String, Object> getMyScoreView(UUID userId) {
        FatigueScore latest = getLatestScore(userId);
        if (latest == null) {
            return Map.of(
                    "userId", userId,
                    "score", 0,
                    "riskLevel", "LOW",
                    "lastAssessment", (Object) null,
                    "history", List.of()
            );
        }

        List<FatigueScore> trend = getTrend(userId, 30);
        List<Map<String, Object>> history = trend.stream()
                .map(s -> Map.<String, Object>of(
                        "date", s.getCalculatedAt().toString(),
                        "score", s.getScore()))
                .toList();

        Map<String, Object> lastAssessment = selfReportRepository
                .findFirstByUserIdOrderByReportedAtDesc(userId)
                .map(r -> Map.<String, Object>of(
                        "date", r.getReportedAt().toString(),
                        "sleepHours", r.getSleepHours(),
                        "alertness", r.getAlertness()))
                .orElse(null);

        Map<String, Object> view = new java.util.LinkedHashMap<>();
        view.put("userId", latest.getUserId());
        view.put("score", latest.getScore());
        view.put("riskLevel", latest.getRiskLevel().name());
        view.put("calculatedAt", latest.getCalculatedAt());
        view.put("hoursWorked24h", latest.getHoursWorked24h());
        view.put("hoursWorked7d", latest.getHoursWorked7d());
        view.put("nightShifts7d", latest.getNightShifts7d());
        view.put("consecutiveDays", latest.getConsecutiveDays());
        view.put("modelVersion", latest.getModelVersion());
        view.put("lastAssessment", lastAssessment);
        view.put("history", history);
        return view;
    }

    // --- Request records ---

    public record RecomputeRequest(
            UUID userId,
            BigDecimal hoursWorked24h,
            BigDecimal hoursWorked7d,
            int nightShifts7d,
            int consecutiveDays
    ) {}

    public record SelfReportRequest(
            UUID userId,
            UUID shiftId,
            BigDecimal sleepHours,
            Integer alertness
    ) {}
}
