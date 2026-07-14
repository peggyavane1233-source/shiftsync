package io.shiftsync.reporting.domain;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "reporting_muster_unaccounted")
public class ReportingMusterUnaccounted {
    @Id
    private UUID id;

    @Column(name = "muster_id", nullable = false)
    private UUID musterId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "employee_no", nullable = false)
    private String employeeNo;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getMusterId() { return musterId; }
    public void setMusterId(UUID musterId) { this.musterId = musterId; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public String getEmployeeNo() { return employeeNo; }
    public void setEmployeeNo(String employeeNo) { this.employeeNo = employeeNo; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
}
