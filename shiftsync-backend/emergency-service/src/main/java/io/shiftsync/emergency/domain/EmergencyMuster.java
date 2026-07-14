package io.shiftsync.emergency.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "emergency_musters")
public class EmergencyMuster {
    @Id
    private UUID id;

    @Column(nullable = false)
    private UUID zone;

    @Column(name = "initiated_by", nullable = false)
    private UUID initiatedBy;

    @Column(name = "initiated_at", nullable = false)
    private Instant initiatedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MusterStatus status;

    @Column(name = "expected_workers", nullable = false)
    private int expectedWorkers;

    @Column(name = "accounted_workers", nullable = false)
    private int accountedWorkers;

    // Getters and setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getZone() { return zone; }
    public void setZone(UUID zone) { this.zone = zone; }

    public UUID getInitiatedBy() { return initiatedBy; }
    public void setInitiatedBy(UUID initiatedBy) { this.initiatedBy = initiatedBy; }

    public Instant getInitiatedAt() { return initiatedAt; }
    public void setInitiatedAt(Instant initiatedAt) { this.initiatedAt = initiatedAt; }

    public Instant getClosedAt() { return closedAt; }
    public void setClosedAt(Instant closedAt) { this.closedAt = closedAt; }

    public MusterStatus getStatus() { return status; }
    public void setStatus(MusterStatus status) { this.status = status; }

    public int getExpectedWorkers() { return expectedWorkers; }
    public void setExpectedWorkers(int expectedWorkers) { this.expectedWorkers = expectedWorkers; }

    public int getAccountedWorkers() { return accountedWorkers; }
    public void setAccountedWorkers(int accountedWorkers) { this.accountedWorkers = accountedWorkers; }
}
