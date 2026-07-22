package io.shiftsync.attendance.service;

import io.shiftsync.attendance.client.ShiftServiceClient;
import io.shiftsync.attendance.domain.AttendanceRecord;
import io.shiftsync.attendance.repository.AttendanceRecordRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
public class HeadcountService {

    private final AttendanceRecordRepository repository;
    private final ShiftServiceClient shiftClient;
    private final SimpMessagingTemplate messagingTemplate;

    public HeadcountService(AttendanceRecordRepository repository,
                            ShiftServiceClient shiftClient,
                            SimpMessagingTemplate messagingTemplate) {
        this.repository = repository;
        this.shiftClient = shiftClient;
        this.messagingTemplate = messagingTemplate;
    }

    public Map<String, Object> getHeadcount(UUID shiftId) {
        List<Map<String, Object>> assignments = shiftClient.assignmentsForShift(shiftId);
        List<AttendanceRecord> records = repository.findByShiftIdAndCheckOutTimeIsNull(shiftId);
        int present = records.size();
        int expected = assignments.size();
        int missing = Math.max(0, expected - present);

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("present", present);
        stats.put("expected", expected);
        stats.put("missing", missing);
        stats.put("records", records.stream().map(this::recordToMap).toList());
        stats.put("assignments", assignments);
        return stats;
    }

    public AttendanceRecord markManual(UUID shiftId, UUID workerId) {
        Optional<AttendanceRecord> existing = repository.findByUserIdAndShiftId(workerId, shiftId)
                .filter(r -> r.getCheckOutTime() == null);
        if (existing.isPresent()) return existing.get();

        AttendanceRecord record = new AttendanceRecord();
        record.setId(UUID.randomUUID());
        record.setUserId(workerId);
        record.setShiftId(shiftId);
        record.setMethod("MANUAL");
        record.setCheckInTime(Instant.now());
        record.setCapturedAt(Instant.now());
        record.setSyncedAt(Instant.now());
        record.setClientUuid(UUID.randomUUID());
        AttendanceRecord saved = repository.save(record);
        broadcast(shiftId);
        return saved;
    }

    public void broadcast(UUID shiftId) {
        messagingTemplate.convertAndSend("/topic/headcount/" + shiftId, getHeadcount(shiftId));
    }

    public List<UUID> getActiveWorkersForZone(UUID zone) {
        List<UUID> shiftIds = shiftClient.shiftIdsByDepartment(zone);
        if (shiftIds.isEmpty()) return List.of();
        return repository.findActiveWorkerIdsForShifts(shiftIds);
    }

    private Map<String, Object> recordToMap(AttendanceRecord r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("userId", r.getUserId());
        m.put("shiftId", r.getShiftId());
        m.put("method", r.getMethod());
        m.put("checkInTime", r.getCheckInTime());
        m.put("checkOutTime", r.getCheckOutTime());
        m.put("capturedAt", r.getCapturedAt());
        m.put("syncedAt", r.getSyncedAt());
        m.put("isOfflineSync", r.isOfflineSync());
        m.put("clientUuid", r.getClientUuid());
        return m;
    }
}
