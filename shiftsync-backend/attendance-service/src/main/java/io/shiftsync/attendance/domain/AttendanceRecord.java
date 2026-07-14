package io.shiftsync.attendance.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "attendance_records")
public class AttendanceRecord {
    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "shift_id", nullable = false)
    private UUID shiftId;

    @Column(nullable = false)
    private String method; // 'QR','GPS','MANUAL'

    @Column(name = "check_in_time")
    private Instant checkInTime;

    @Column(name = "check_out_time")
    private Instant checkOutTime;

    @Column(name = "device_id")
    private String deviceId;

    @Column(name = "captured_at", nullable = false)
    private Instant capturedAt;

    @Column(name = "synced_at")
    private Instant syncedAt;

    @Column(name = "is_offline_sync", nullable = false)
    private boolean isOfflineSync = false;

    @Column(name = "requires_review", nullable = false)
    private boolean requiresReview = false;

    @Column(name = "client_uuid", nullable = false, unique = true)
    private UUID clientUuid;

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public UUID getShiftId() { return shiftId; }
    public void setShiftId(UUID shiftId) { this.shiftId = shiftId; }
    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }
    public Instant getCheckInTime() { return checkInTime; }
    public void setCheckInTime(Instant checkInTime) { this.checkInTime = checkInTime; }
    public Instant getCheckOutTime() { return checkOutTime; }
    public void setCheckOutTime(Instant checkOutTime) { this.checkOutTime = checkOutTime; }
    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }
    public Instant getCapturedAt() { return capturedAt; }
    public void setCapturedAt(Instant capturedAt) { this.capturedAt = capturedAt; }
    public Instant getSyncedAt() { return syncedAt; }
    public void setSyncedAt(Instant syncedAt) { this.syncedAt = syncedAt; }
    public boolean isOfflineSync() { return isOfflineSync; }
    public void setOfflineSync(boolean offlineSync) { isOfflineSync = offlineSync; }
    public boolean isRequiresReview() { return requiresReview; }
    public void setRequiresReview(boolean requiresReview) { this.requiresReview = requiresReview; }
    public UUID getClientUuid() { return clientUuid; }
    public void setClientUuid(UUID clientUuid) { this.clientUuid = clientUuid; }
}
