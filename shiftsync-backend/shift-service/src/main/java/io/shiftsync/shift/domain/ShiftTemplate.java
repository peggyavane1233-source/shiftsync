package io.shiftsync.shift.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "shift_templates")
public class ShiftTemplate {
    @Id
    private UUID id;

    @Column(name = "department_id", nullable = false)
    private UUID departmentId;

    @Column(nullable = false)
    private String name;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "duration_hrs", nullable = false)
    private int durationHrs;

    @Column(name = "required_cert_id")
    private UUID requiredCertId;

    @Column(name = "required_role")
    private String requiredRole;

    @Column(nullable = false)
    private int headcount = 1;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    
    public UUID getDepartmentId() { return departmentId; }
    public void setDepartmentId(UUID departmentId) { this.departmentId = departmentId; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }
    
    public int getDurationHrs() { return durationHrs; }
    public void setDurationHrs(int durationHrs) { this.durationHrs = durationHrs; }
    
    public UUID getRequiredCertId() { return requiredCertId; }
    public void setRequiredCertId(UUID requiredCertId) { this.requiredCertId = requiredCertId; }
    
    public String getRequiredRole() { return requiredRole; }
    public void setRequiredRole(String requiredRole) { this.requiredRole = requiredRole; }
    
    public int getHeadcount() { return headcount; }
    public void setHeadcount(int headcount) { this.headcount = headcount; }
    
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
