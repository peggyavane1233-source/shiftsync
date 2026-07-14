package io.shiftsync.reporting.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reporting_musters")
public class ReportingMuster {
    @Id
    private UUID id;

    @Column(nullable = false)
    private UUID zone;

    @Column(name = "initiated_at", nullable = false)
    private Instant initiatedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "expected_workers", nullable = false)
    private int expectedWorkers;

    @Column(name = "accounted_workers", nullable = false)
    private int accountedWorkers;

    @Column(name = "time_to_full_headcount_seconds")
    private Integer timeToFullHeadcountSeconds;

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getZone() { return zone; }
    public void setZone(UUID zone) { this.zone = zone; }

    public Instant getInitiatedAt() { return initiatedAt; }
    public void setInitiatedAt(Instant initiatedAt) { this.initiatedAt = initiatedAt; }

    public Instant getClosedAt() { return closedAt; }
    public void setClosedAt(Instant closedAt) { this.closedAt = closedAt; }

    public int getExpectedWorkers() { return expectedWorkers; }
    public void setExpectedWorkers(int expectedWorkers) { this.expectedWorkers = expectedWorkers; }

    public int getAccountedWorkers() { return accountedWorkers; }
    public void setAccountedWorkers(int accountedWorkers) { this.accountedWorkers = accountedWorkers; }

    public Integer getTimeToFullHeadcountSeconds() { return timeToFullHeadcountSeconds; }
    public void setTimeToFullHeadcountSeconds(Integer timeToFullHeadcountSeconds) { this.timeToFullHeadcountSeconds = timeToFullHeadcountSeconds; }
}
