package io.shiftsync.attendance.controller;

import io.shiftsync.attendance.domain.AttendanceRecord;
import io.shiftsync.attendance.service.AttendanceService;
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
    private final RedisTemplate<String, Object> redisTemplate;

    public AttendanceController(AttendanceService attendanceService, AttendanceRecordRepository repository, RedisTemplate<String, Object> redisTemplate) {
        this.attendanceService = attendanceService;
        this.repository = repository;
        this.redisTemplate = redisTemplate;
    }

    @PostMapping("/checkin")
    public ResponseEntity<AttendanceRecord> checkIn(@RequestBody AttendanceService.CheckInRequest request) {
        AttendanceRecord record = attendanceService.checkIn(request);
        return ResponseEntity.ok(record);
    }

    @PostMapping("/checkout")
    public ResponseEntity<AttendanceRecord> checkOut(@RequestBody AttendanceService.CheckOutRequest request) {
        AttendanceRecord record = attendanceService.checkOut(request);
        return ResponseEntity.ok(record);
    }

    @PostMapping("/sync")
    public ResponseEntity<SyncResponse> batchSync(@RequestBody List<AttendanceService.CheckInRequest> requests) {
        if (requests.size() > 200) {
            return ResponseEntity.badRequest().build();
        }

        // Process in capturedAt ASC order
        requests.sort(Comparator.comparing(AttendanceService.CheckInRequest::capturedAt));

        List<UUID> accepted = new ArrayList<>();
        List<Map<String, Object>> rejected = new ArrayList<>();

        for (var req : requests) {
            try {
                // Determine if it's checkin or checkout based on method/payload. Assuming check-ins for now
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
        return ResponseEntity.ok(repository.findActiveWorkersByDepartmentId(zone));
    }

    public record SyncResponse(List<UUID> accepted, List<Map<String, Object>> rejected) {}
}
