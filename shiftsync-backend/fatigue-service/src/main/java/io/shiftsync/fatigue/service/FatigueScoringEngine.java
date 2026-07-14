package io.shiftsync.fatigue.service;

import io.shiftsync.fatigue.domain.RiskLevel;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/**
 * FAID/FAST-family biomathematical fatigue scoring engine.
 * 
 * This is a PURE FUNCTION — no database access, no side effects.
 * All state lives in Postgres. This makes it trivially testable and horizontally scalable.
 * 
 * The model combines:
 *   - Homeostatic sleep-pressure (acute hours + sleep debt)
 *   - Circadian disruption (night shifts)
 *   - Cumulative load (weekly hours + consecutive days without rest)
 *   - Subjective self-report (Karolinska-style alertness, optional)
 * 
 * Every score persists its model_version. When the model changes,
 * historical scores remain interpretable. This is a compliance requirement.
 * 
 * Model version: 1.0.0
 */
@Component
public class FatigueScoringEngine {

    /**
     * Compute fatigue score from the given inputs.
     * 
     * @return ScoringResult containing the integer score (0-100) and the risk level band.
     */
    public ScoringResult calculate(FatigueInputs inputs) {
        double raw = 0.0;

        // 1. Acute load — hours worked in the last 24h (weight: 30)
        //    Linear ramp: 12h = max contribution
        raw += clamp01(inputs.hoursWorked24h().doubleValue() / 12.0) * 30.0;

        // 2. Cumulative load — hours worked in the last 7 days (weight: 20)
        //    60h/week = max contribution
        raw += clamp01(inputs.hoursWorked7d().doubleValue() / 60.0) * 20.0;

        // 3. Circadian disruption — night shifts in the last 7 days (weight: 20)
        //    4+ night shifts = max disruption
        raw += clamp01((double) inputs.nightShifts7d() / 4.0) * 20.0;

        // 4. Recovery deficit — consecutive days without a rest day (weight: 15)
        //    7+ consecutive days = max contribution
        raw += clamp01((double) inputs.consecutiveDays() / 7.0) * 15.0;

        // 5. Sleep debt — from self-report (weight: 15, optional)
        //    The model degrades gracefully without this input.
        if (inputs.sleepHours() != null) {
            double sleepDebt = Math.max(0.0, (8.0 - inputs.sleepHours().doubleValue()) / 8.0);
            raw += clamp01(sleepDebt) * 15.0;
        }

        int score = (int) Math.round(Math.min(raw, 100.0));
        RiskLevel level = band(score);

        return new ScoringResult(score, level);
    }

    /**
     * Determine risk band from a numeric score.
     * These thresholds are mining-safety critical and must match the spec exactly.
     */
    public static RiskLevel band(int score) {
        if (score >= 80) return RiskLevel.CRITICAL;    // red   — check-in BLOCKED
        if (score >= 60) return RiskLevel.WARNING;     // orange — supervisor notified
        if (score >= 40) return RiskLevel.ADVISORY;    // yellow — worker notified
        return RiskLevel.LOW;                          // green  — no action
    }

    private static double clamp01(double value) {
        return Math.max(0.0, Math.min(1.0, value));
    }

    /** Immutable inputs to the scoring model. */
    public record FatigueInputs(
            BigDecimal hoursWorked24h,
            BigDecimal hoursWorked7d,
            int nightShifts7d,
            int consecutiveDays,
            BigDecimal sleepHours  // nullable — model degrades gracefully
    ) {}

    /** Immutable result from the scoring model. */
    public record ScoringResult(int score, RiskLevel riskLevel) {}
}
