package io.shiftsync.fatigue.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Worker self-report: sleep hours + alertness (Karolinska-style 1-5 scale).
 * Optional input to the fatigue model — the model degrades gracefully without it.
 */
@Entity
@Table(name = "fatigue_self_reports")
public class FatigueSelfReport {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "shift_id")
    private UUID shiftId;

    @Column(name = "sleep_hours")
    private BigDecimal sleepHours;

    @Column(name = "alertness")
    private Integer alertness;

    @Column(name = "reported_at", nullable = false)
    private Instant reportedAt;

    // --- Getters & Setters ---

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public UUID getShiftId() { return shiftId; }
    public void setShiftId(UUID shiftId) { this.shiftId = shiftId; }

    public BigDecimal getSleepHours() { return sleepHours; }
    public void setSleepHours(BigDecimal sleepHours) { this.sleepHours = sleepHours; }

    public Integer getAlertness() { return alertness; }
    public void setAlertness(Integer alertness) { this.alertness = alertness; }

    public Instant getReportedAt() { return reportedAt; }
    public void setReportedAt(Instant reportedAt) { this.reportedAt = reportedAt; }
}
