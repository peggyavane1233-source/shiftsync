package io.shiftsync.fatigue.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * Safety data — append-only. Never hard-deleted.
 * A regulator will ask for the override_reason and who acknowledged it.
 */
@Entity
@Table(name = "fatigue_alerts")
public class FatigueAlert {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "score_id", nullable = false)
    private UUID scoreId;

    @Enumerated(EnumType.STRING)
    @Column(name = "alert_level", nullable = false)
    private RiskLevel alertLevel;

    @Column(name = "triggered_at", nullable = false)
    private Instant triggeredAt;

    @Column(name = "acknowledged_by")
    private UUID acknowledgedBy;

    @Column(name = "acknowledged_at")
    private Instant acknowledgedAt;

    @Column(name = "override_reason")
    private String overrideReason;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    // --- Getters & Setters ---

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public UUID getScoreId() { return scoreId; }
    public void setScoreId(UUID scoreId) { this.scoreId = scoreId; }

    public RiskLevel getAlertLevel() { return alertLevel; }
    public void setAlertLevel(RiskLevel alertLevel) { this.alertLevel = alertLevel; }

    public Instant getTriggeredAt() { return triggeredAt; }
    public void setTriggeredAt(Instant triggeredAt) { this.triggeredAt = triggeredAt; }

    public UUID getAcknowledgedBy() { return acknowledgedBy; }
    public void setAcknowledgedBy(UUID acknowledgedBy) { this.acknowledgedBy = acknowledgedBy; }

    public Instant getAcknowledgedAt() { return acknowledgedAt; }
    public void setAcknowledgedAt(Instant acknowledgedAt) { this.acknowledgedAt = acknowledgedAt; }

    public String getOverrideReason() { return overrideReason; }
    public void setOverrideReason(String overrideReason) { this.overrideReason = overrideReason; }

    public Instant getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(Instant resolvedAt) { this.resolvedAt = resolvedAt; }
}
