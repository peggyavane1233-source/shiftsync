package io.shiftsync.fatigue.service;

import io.shiftsync.fatigue.domain.RiskLevel;
import io.shiftsync.fatigue.service.FatigueScoringEngine.FatigueInputs;
import io.shiftsync.fatigue.service.FatigueScoringEngine.ScoringResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Golden-case tests for the scoring engine.
 * These are safety-critical: if these break, the engine is broken.
 * Target: ≥90% coverage on scoring.py (spec §17).
 */
class FatigueScoringEngineTest {

    private FatigueScoringEngine engine;

    @BeforeEach
    void setUp() {
        engine = new FatigueScoringEngine();
    }

    // ========== Band thresholds ==========

    @Nested
    @DisplayName("Risk level banding")
    class BandTests {

        @ParameterizedTest(name = "score {0} → {1}")
        @CsvSource({
                "0,   LOW",
                "39,  LOW",
                "40,  ADVISORY",
                "59,  ADVISORY",
                "60,  WARNING",
                "79,  WARNING",
                "80,  CRITICAL",
                "100, CRITICAL"
        })
        void bandThresholds(int score, RiskLevel expected) {
            assertEquals(expected, FatigueScoringEngine.band(score));
        }
    }

    // ========== Golden cases ==========

    @Test
    @DisplayName("Fresh worker — 0h worked, full rest → LOW")
    void freshWorker() {
        FatigueInputs inputs = new FatigueInputs(
                BigDecimal.ZERO, BigDecimal.ZERO, 0, 0, new BigDecimal("8.0")
        );
        ScoringResult result = engine.calculate(inputs);
        assertEquals(0, result.score());
        assertEquals(RiskLevel.LOW, result.riskLevel());
    }

    @Test
    @DisplayName("Moderate load — 8h/24h, 40h/7d, 1 night, 4 days, 7h sleep → ADVISORY range")
    void moderateLoad() {
        FatigueInputs inputs = new FatigueInputs(
                new BigDecimal("8.0"),   // 8/12 = 0.667 * 30 = 20
                new BigDecimal("40.0"),  // 40/60 = 0.667 * 20 = 13.3
                1,                       // 1/4 = 0.25 * 20 = 5
                4,                       // 4/7 = 0.571 * 15 = 8.6
                new BigDecimal("7.0")    // (8-7)/8 = 0.125 * 15 = 1.875
        );
        ScoringResult result = engine.calculate(inputs);
        // Expected: 20 + 13.3 + 5 + 8.6 + 1.875 ≈ 49
        assertTrue(result.score() >= 40 && result.score() < 60,
                "Score " + result.score() + " should be ADVISORY (40-59)");
        assertEquals(RiskLevel.ADVISORY, result.riskLevel());
    }

    @Test
    @DisplayName("Heavy load — 12h/24h, 60h/7d, 4 nights, 7 days, 4h sleep → CRITICAL")
    void heavyLoad() {
        FatigueInputs inputs = new FatigueInputs(
                new BigDecimal("12.0"),  // 12/12 = 1.0 * 30 = 30
                new BigDecimal("60.0"),  // 60/60 = 1.0 * 20 = 20
                4,                       // 4/4 = 1.0 * 20 = 20
                7,                       // 7/7 = 1.0 * 15 = 15
                new BigDecimal("4.0")    // (8-4)/8 = 0.5 * 15 = 7.5
        );
        ScoringResult result = engine.calculate(inputs);
        // Expected: 30 + 20 + 20 + 15 + 7.5 = 92.5 → 93
        assertTrue(result.score() >= 80, "Score " + result.score() + " should be CRITICAL (80+)");
        assertEquals(RiskLevel.CRITICAL, result.riskLevel());
    }

    @Test
    @DisplayName("Max saturation — everything maxed out → capped at 100")
    void maxSaturation() {
        FatigueInputs inputs = new FatigueInputs(
                new BigDecimal("16.0"),  // clamped to 1.0
                new BigDecimal("80.0"),  // clamped to 1.0
                6,                       // clamped to 1.0
                10,                      // clamped to 1.0
                new BigDecimal("0.0")    // (8-0)/8 = 1.0
        );
        ScoringResult result = engine.calculate(inputs);
        assertEquals(100, result.score(), "Score should cap at 100");
        assertEquals(RiskLevel.CRITICAL, result.riskLevel());
    }

    @Test
    @DisplayName("No self-report — model degrades gracefully, sleep component excluded")
    void noSelfReport() {
        FatigueInputs inputs = new FatigueInputs(
                new BigDecimal("8.0"), new BigDecimal("40.0"), 1, 4, null
        );
        ScoringResult result = engine.calculate(inputs);
        // Without sleep: 20 + 13.3 + 5 + 8.6 = ~47
        assertTrue(result.score() >= 40 && result.score() < 60,
                "Score " + result.score() + " without sleep should still be ADVISORY");
    }

    @Test
    @DisplayName("WARNING threshold — 10h/24h, 50h/7d, 3 nights, 5 days, 5h sleep")
    void warningThreshold() {
        FatigueInputs inputs = new FatigueInputs(
                new BigDecimal("10.0"),  // 10/12 = 0.833 * 30 = 25
                new BigDecimal("50.0"),  // 50/60 = 0.833 * 20 = 16.7
                3,                       // 3/4 = 0.75 * 20 = 15
                5,                       // 5/7 = 0.714 * 15 = 10.7
                new BigDecimal("5.0")    // (8-5)/8 = 0.375 * 15 = 5.625
        );
        ScoringResult result = engine.calculate(inputs);
        // Expected: 25 + 16.7 + 15 + 10.7 + 5.625 ≈ 73
        assertTrue(result.score() >= 60 && result.score() < 80,
                "Score " + result.score() + " should be WARNING (60-79)");
        assertEquals(RiskLevel.WARNING, result.riskLevel());
    }
}
