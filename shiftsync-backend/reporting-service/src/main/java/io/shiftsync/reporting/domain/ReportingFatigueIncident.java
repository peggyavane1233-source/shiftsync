package io.shiftsync.reporting.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reporting_fatigue_incidents")
public class ReportingFatigueIncident {
    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "employee_no", nullable = false)
    private String employeeNo;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "alert_time", nullable = false)
    private Instant alertTime;

    @Column(nullable = false)
    private boolean overridden;

    @Column(name = "overridden_by")
    private UUID overriddenBy;

    @Column(name = "override_reason")
    private String overrideReason;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public String getEmployeeNo() { return employeeNo; }
    public void setEmployeeNo(String employeeNo) { this.employeeNo = employeeNo; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public Instant getAlertTime() { return alertTime; }
    public void setAlertTime(Instant alertTime) { this.alertTime = alertTime; }

    public boolean isOverridden() { return overridden; }
    public void setOverridden(boolean overridden) { this.overridden = overridden; }

    public UUID getOverriddenBy() { return overriddenBy; }
    public void setOverriddenBy(UUID overriddenBy) { this.overriddenBy = overriddenBy; }

    public String getOverrideReason() { return overrideReason; }
    public void setOverrideReason(String overrideReason) { this.overrideReason = overrideReason; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
