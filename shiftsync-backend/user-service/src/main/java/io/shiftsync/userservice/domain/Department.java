package io.shiftsync.userservice.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "departments")
public class Department {

    @Id
    private UUID id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "mine_zone", nullable = false, length = 80)
    private String mineZone;

    @Column(name = "supervisor_id")
    private UUID supervisorId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getMineZone() { return mineZone; }
    public void setMineZone(String mineZone) { this.mineZone = mineZone; }

    public UUID getSupervisorId() { return supervisorId; }
    public void setSupervisorId(UUID supervisorId) { this.supervisorId = supervisorId; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
