package io.shiftsync.fatigue.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Append-only fatigue score record.
 * Every score persists its model_version so historical scores remain interpretable
 * even after the scoring algorithm changes. This is a compliance requirement.
 */
@Entity
@Table(name = "fatigue_scores")
public class FatigueScore {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "calculated_at", nullable = false)
    private Instant calculatedAt;

    @Column(name = "hours_worked_24h", nullable = false)
    private BigDecimal hoursWorked24h;

    @Column(name = "hours_worked_7d", nullable = false)
    private BigDecimal hoursWorked7d;

    @Column(name = "night_shifts_7d", nullable = false)
    private int nightShifts7d;

    @Column(name = "consecutive_days", nullable = false)
    private int consecutiveDays;

    @Column(name = "self_report_score")
    private Integer selfReportScore;

    @Column(nullable = false)
    private int score;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", nullable = false)
    private RiskLevel riskLevel;

    @Column(name = "model_version", nullable = false)
    private String modelVersion;

    // --- Getters & Setters ---

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public Instant getCalculatedAt() { return calculatedAt; }
    public void setCalculatedAt(Instant calculatedAt) { this.calculatedAt = calculatedAt; }

    public BigDecimal getHoursWorked24h() { return hoursWorked24h; }
    public void setHoursWorked24h(BigDecimal hoursWorked24h) { this.hoursWorked24h = hoursWorked24h; }

    public BigDecimal getHoursWorked7d() { return hoursWorked7d; }
    public void setHoursWorked7d(BigDecimal hoursWorked7d) { this.hoursWorked7d = hoursWorked7d; }

    public int getNightShifts7d() { return nightShifts7d; }
    public void setNightShifts7d(int nightShifts7d) { this.nightShifts7d = nightShifts7d; }

    public int getConsecutiveDays() { return consecutiveDays; }
    public void setConsecutiveDays(int consecutiveDays) { this.consecutiveDays = consecutiveDays; }

    public Integer getSelfReportScore() { return selfReportScore; }
    public void setSelfReportScore(Integer selfReportScore) { this.selfReportScore = selfReportScore; }

    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }

    public RiskLevel getRiskLevel() { return riskLevel; }
    public void setRiskLevel(RiskLevel riskLevel) { this.riskLevel = riskLevel; }

    public String getModelVersion() { return modelVersion; }
    public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }
}
