package io.shiftsync.attendance.controller;

import io.shiftsync.attendance.domain.AttendanceRecord;
import io.shiftsync.attendance.service.AttendanceService;
import io.shiftsync.attendance.service.HeadcountService;
import io.shiftsync.attendance.repository.AttendanceRecordRepository;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/attendance")
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final AttendanceRecordRepository repository;
    private final HeadcountService headcountService;
    private final RedisTemplate<String, Object> redisTemplate;

    public AttendanceController(AttendanceService attendanceService,
                                AttendanceRecordRepository repository,
                                HeadcountService headcountService,
                                RedisTemplate<String, Object> redisTemplate) {
        this.attendanceService = attendanceService;
        this.repository = repository;
        this.headcountService = headcountService;
        this.redisTemplate = redisTemplate;
    }

    @PostMapping("/checkin")
    public ResponseEntity<AttendanceRecord> checkIn(@RequestBody AttendanceService.CheckInRequest request) {
        AttendanceRecord record = attendanceService.checkIn(request);
        headcountService.broadcast(record.getShiftId());
        return ResponseEntity.ok(record);
    }

    @PostMapping("/checkout")
    public ResponseEntity<AttendanceRecord> checkOut(@RequestBody AttendanceService.CheckOutRequest request) {
        AttendanceRecord record = attendanceService.checkOut(request);
        headcountService.broadcast(record.getShiftId());
        return ResponseEntity.ok(record);
    }

    @PostMapping("/sync")
    public ResponseEntity<SyncResponse> batchSync(@RequestBody List<AttendanceService.CheckInRequest> requests) {
        if (requests.size() > 200) {
            return ResponseEntity.badRequest().build();
        }

        requests.sort(Comparator.comparing(AttendanceService.CheckInRequest::capturedAt));

        List<UUID> accepted = new ArrayList<>();
        List<Map<String, Object>> rejected = new ArrayList<>();

        for (var req : requests) {
            try {
                attendanceService.checkIn(req);
                accepted.add(req.clientUuid());
            } catch (Exception e) {
                rejected.add(Map.of(
                        "clientUuid", req.clientUuid() != null ? req.clientUuid() : "unknown",
                        "error", e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()
                ));
            }
        }

        return ResponseEntity.ok(new SyncResponse(accepted, rejected));
    }

    @GetMapping("/live")
    public ResponseEntity<Map<String, Object>> getLiveHeadcount(@RequestParam UUID zone) {
        Object count = redisTemplate.opsForValue().get("headcount:" + zone);
        return ResponseEntity.ok(Map.of(
                "zone", zone,
                "headcount", count != null ? Integer.parseInt(count.toString()) : 0
        ));
    }

    @GetMapping("/active")
    public ResponseEntity<List<UUID>> getActiveWorkers(@RequestParam UUID zone) {
        return ResponseEntity.ok(headcountService.getActiveWorkersForZone(zone));
    }

    /** GET /v1/attendance/me — worker attendance history (mock contract). */
    @GetMapping("/me")
    public ResponseEntity<List<AttendanceRecord>> mine(@RequestHeader("X-User-Id") String userId) {
        return ResponseEntity.ok(repository.findByUserIdOrderByCapturedAtDesc(UUID.fromString(userId)));
    }

    /** GET /v1/attendance/shifts/{shiftId}/headcount */
    @GetMapping("/shifts/{shiftId}/headcount")
    public ResponseEntity<Map<String, Object>> headcount(@PathVariable UUID shiftId) {
        return ResponseEntity.ok(headcountService.getHeadcount(shiftId));
    }

    /** POST /v1/attendance/shifts/{shiftId}/manual */
    @PostMapping("/shifts/{shiftId}/manual")
    public ResponseEntity<AttendanceRecord> markManual(@PathVariable UUID shiftId,
                                                         @RequestBody ManualMarkRequest body) {
        return ResponseEntity.ok(headcountService.markManual(shiftId, body.workerId()));
    }

    public record SyncResponse(List<UUID> accepted, List<Map<String, Object>> rejected) {}
    public record ManualMarkRequest(UUID workerId) {}
}
