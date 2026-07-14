package io.shiftsync.attendance.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.shiftsync.attendance.client.FatigueServiceClient;
import io.shiftsync.attendance.client.ShiftServiceClient;
import io.shiftsync.attendance.client.UserServiceClient;
import io.shiftsync.attendance.domain.AttendanceRecord;
import io.shiftsync.attendance.domain.OutboxEvent;
import io.shiftsync.attendance.repository.AttendanceRecordRepository;
import io.shiftsync.attendance.repository.OutboxEventRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class AttendanceService {

    private final AttendanceRecordRepository attendanceRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final QRService qrService;
    private final ShiftServiceClient shiftClient;
    private final UserServiceClient userClient;
    private final FatigueServiceClient fatigueClient;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    public AttendanceService(AttendanceRecordRepository attendanceRepository,
                             OutboxEventRepository outboxEventRepository,
                             QRService qrService,
                             ShiftServiceClient shiftClient,
                             UserServiceClient userClient,
                             FatigueServiceClient fatigueClient,
                             RedisTemplate<String, Object> redisTemplate,
                             ObjectMapper objectMapper) {
        this.attendanceRepository = attendanceRepository;
        this.outboxEventRepository = outboxEventRepository;
        this.qrService = qrService;
        this.shiftClient = shiftClient;
        this.userClient = userClient;
        this.fatigueClient = fatigueClient;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public AttendanceRecord checkIn(CheckInRequest req) {
        // 1. clientUuid present?
        if (req.clientUuid() == null) {
            throw new IllegalArgumentException("clientUuid is required");
        }

        // 2. Idempotency: try to find first
        Optional<AttendanceRecord> existing = attendanceRepository.findByClientUuid(req.clientUuid());
        if (existing.isPresent()) {
            return existing.get();
        }

        // Initialize record early to leverage unique constraint if concurrent
        AttendanceRecord record = new AttendanceRecord();
        record.setId(UUID.randomUUID());
        record.setClientUuid(req.clientUuid());
        record.setUserId(req.userId());
        record.setShiftId(req.shiftId());
        record.setMethod(req.method());
        record.setCheckInTime(req.capturedAt());
        record.setCapturedAt(req.capturedAt());
        record.setSyncedAt(Instant.now());
        record.setOfflineSync(req.isOfflineSync());
        record.setDeviceId(req.deviceId());

        // We will try to save it right now to enforce idempotency concurrency
        try {
            attendanceRepository.saveAndFlush(record);
        } catch (DataIntegrityViolationException e) {
            // Replay hit race condition
            return attendanceRepository.findByClientUuid(req.clientUuid())
                    .orElseThrow(() -> new IllegalStateException("Record exists but could not be found"));
        }

        try {
            // 3. QR Mode validation
            if ("QR".equals(req.method())) {
                if (req.qrToken() == null || !qrService.validateQR(req.qrToken(), req.shiftId())) {
                    throw new IllegalArgumentException("QR_EXPIRED");
                }
            }

            // 4. Worker is rostered?
            boolean isRostered = false;
            try {
                isRostered = shiftClient.verifyAssignment(req.shiftId(), req.userId());
            } catch (Exception e) {
                // If service is down, maybe reject? Strict mode -> reject
                throw new IllegalStateException("Could not verify roster assignment");
            }
            if (!isRostered) {
                throw new SecurityException("NOT_ROSTERED");
            }

            // 5. GPS Mode validation
            if ("GPS".equals(req.method())) {
                boolean insideZone = false;
                try {
                    insideZone = userClient.checkGeofence(req.departmentId(), req.lat(), req.lng());
                } catch (Exception e) {
                    throw new IllegalStateException("Could not verify geofence");
                }
                if (!insideZone) {
                    throw new SecurityException("OUTSIDE_ZONE");
                }
            }

            // 6. Fatigue validation
            try {
                var fatigue = fatigueClient.getLatestScore(req.userId());
                if ("CRITICAL".equalsIgnoreCase(fatigue.riskLevel()) && !req.overrideFatigue()) {
                    throw new IllegalStateException("FATIGUE_CRITICAL");
                }
            } catch (Exception e) {
                // Unknown fatigue is dangerous
                throw new IllegalStateException("FATIGUE_UNKNOWN");
            }

            // 8. Clock drift
            long driftSeconds = Math.abs(Duration.between(req.capturedAt(), Instant.now()).getSeconds());
            if (driftSeconds > 600 && !req.isOfflineSync()) {
                record.setRequiresReview(true);
            }

            // 9. INCR headcount
            redisTemplate.opsForValue().increment("headcount:" + req.departmentId());

            // 10. Publish event
            createOutboxEvent(record.getId(), "AttendanceRecord", "attendance.checked_in", Map.of(
                    "attendanceId", record.getId(),
                    "userId", req.userId(),
                    "shiftId", req.shiftId(),
                    "departmentId", req.departmentId(),
                    "checkInTime", record.getCheckInTime().toString()
            ));

            return attendanceRepository.save(record);
        } catch (Exception e) {
            // Validation failed, rollback the early save!
            throw e; 
            // Note: because we are in @Transactional, throwing RuntimeException rolls back the early insert.
        }
    }

    @Transactional
    public AttendanceRecord checkOut(CheckOutRequest req) {
        if (req.clientUuid() == null) {
            throw new IllegalArgumentException("clientUuid is required");
        }

        // We check if this clientUuid already exists
        // However, checkout updates an existing record based on userId + shiftId
        AttendanceRecord existing = attendanceRepository.findByClientUuid(req.clientUuid()).orElse(null);
        if (existing != null) {
            return existing; // Replayed offline checkout
        }

        AttendanceRecord record = attendanceRepository.findByUserIdAndShiftId(req.userId(), req.shiftId())
                .orElseThrow(() -> new IllegalArgumentException("No check-in found for this shift"));

        if (record.getCheckOutTime() != null) {
            throw new IllegalStateException("Already checked out");
        }

        // Check QR or GPS if needed
        if ("QR".equals(req.method())) {
            if (req.qrToken() == null || !qrService.validateQR(req.qrToken(), req.shiftId())) {
                throw new IllegalArgumentException("QR_EXPIRED");
            }
        } else if ("GPS".equals(req.method())) {
            boolean insideZone = userClient.checkGeofence(req.departmentId(), req.lat(), req.lng());
            if (!insideZone) {
                throw new SecurityException("OUTSIDE_ZONE");
            }
        }

        record.setCheckOutTime(req.capturedAt());
        // Since we update the clientUuid for checkout, we should probably add a new table for check-outs or just update the record
        // The original schema has one client_uuid. We can just change it or add `checkout_client_uuid`.
        // To strictly follow schema, we just update it.
        record.setClientUuid(req.clientUuid());

        // Decrement headcount
        redisTemplate.opsForValue().decrement("headcount:" + req.departmentId());

        createOutboxEvent(record.getId(), "AttendanceRecord", "attendance.checked_out", Map.of(
                "attendanceId", record.getId(),
                "userId", req.userId(),
                "shiftId", req.shiftId(),
                "departmentId", req.departmentId(),
                "checkOutTime", record.getCheckOutTime().toString()
        ));

        return attendanceRepository.save(record);
    }

    private void createOutboxEvent(UUID aggregateId, String type, String eventType, Map<String, Object> payload) {
        try {
            OutboxEvent ev = new OutboxEvent();
            ev.setId(UUID.randomUUID());
            ev.setAggregateId(aggregateId);
            ev.setAggregateType(type);
            ev.setEventType(eventType);
            ev.setPayload(objectMapper.writeValueAsString(payload));
            outboxEventRepository.save(ev);
        } catch (Exception e) {
            throw new RuntimeException("Serialization error", e);
        }
    }

    public record CheckInRequest(UUID clientUuid, UUID userId, UUID shiftId, UUID departmentId, String method, Instant capturedAt, boolean isOfflineSync, String deviceId, String qrToken, double lat, double lng, boolean overrideFatigue) {}
    public record CheckOutRequest(UUID clientUuid, UUID userId, UUID shiftId, UUID departmentId, String method, Instant capturedAt, boolean isOfflineSync, String qrToken, double lat, double lng) {}
}
