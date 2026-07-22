package io.shiftsync.shift.controller;

import io.shiftsync.shift.domain.Shift;
import io.shiftsync.shift.domain.ShiftAssignment;
import io.shiftsync.shift.repository.ShiftAssignmentRepository;
import io.shiftsync.shift.repository.ShiftRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/v1/shifts")
public class ShiftQueryController {

    private final ShiftRepository shiftRepository;
    private final ShiftAssignmentRepository assignmentRepository;

    public ShiftQueryController(ShiftRepository shiftRepository, ShiftAssignmentRepository assignmentRepository) {
        this.shiftRepository = shiftRepository;
        this.assignmentRepository = assignmentRepository;
    }

    /** GET /v1/shifts/me — worker's assigned shifts enriched with assignment metadata. */
    @GetMapping("/me")
    public ResponseEntity<List<Map<String, Object>>> listMine(@RequestHeader("X-User-Id") String userId) {
        UUID uid = UUID.fromString(userId);
        List<ShiftAssignment> assignments = assignmentRepository.findByUserId(uid);
        List<Map<String, Object>> result = new ArrayList<>();
        for (ShiftAssignment assign : assignments) {
            shiftRepository.findById(assign.getShiftId()).ifPresent(shift -> {
                Map<String, Object> row = shiftToMap(shift);
                row.put("assignmentId", assign.getId());
                row.put("assignmentStatus", assign.getStatus());
                row.put("assignedAt", assign.getAssignedAt());
                result.add(row);
            });
        }
        return ResponseEntity.ok(result);
    }

    /** GET /v1/shifts/{shiftId}/assignments/{userId}/verify — internal + attendance contract. */
    @GetMapping("/{shiftId}/assignments/{userId}/verify")
    public ResponseEntity<Boolean> verifyAssignment(@PathVariable UUID shiftId, @PathVariable UUID userId) {
        boolean ok = assignmentRepository.findByShiftId(shiftId).stream()
                .anyMatch(a -> a.getUserId().equals(userId));
        return ResponseEntity.ok(ok);
    }

    /** GET /v1/shifts/{shiftId}/available-workers — workers in dept without shift overlap. */
    @GetMapping("/{shiftId}/available-workers")
    public ResponseEntity<List<Map<String, Object>>> availableWorkers(@PathVariable UUID shiftId) {
        Shift shift = shiftRepository.findById(shiftId).orElse(null);
        if (shift == null) return ResponseEntity.notFound().build();
        // Return assignment user ids as minimal worker stubs until user-service list is wired
        List<Map<String, Object>> workers = assignmentRepository.findByShiftId(shiftId).stream()
                .map(a -> Map.<String, Object>of("id", a.getUserId()))
                .toList();
        return ResponseEntity.ok(workers);
    }

    /** GET /internal/shifts/by-department/{deptId} — for attendance active-worker lookup. */
    @GetMapping("/internal/by-department/{deptId}")
    public ResponseEntity<List<UUID>> shiftIdsByDepartment(@PathVariable UUID deptId) {
        return ResponseEntity.ok(
                shiftRepository.findByDepartmentId(deptId).stream().map(Shift::getId).toList()
        );
    }

    /** GET /internal/shifts/{shiftId}/assignments — headcount contract. */
    @GetMapping("/internal/{shiftId}/assignments")
    public ResponseEntity<List<Map<String, Object>>> assignmentsForShift(@PathVariable UUID shiftId) {
        List<Map<String, Object>> rows = assignmentRepository.findByShiftId(shiftId).stream()
                .map(a -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", a.getId());
                    m.put("shiftId", a.getShiftId());
                    m.put("userId", a.getUserId());
                    m.put("status", a.getStatus());
                    m.put("assignedAt", a.getAssignedAt());
                    return m;
                }).toList();
        return ResponseEntity.ok(rows);
    }

    private Map<String, Object> shiftToMap(Shift shift) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", shift.getId());
        row.put("departmentId", shift.getDepartmentId());
        row.put("startTime", shift.getStartTime());
        row.put("endTime", shift.getEndTime());
        row.put("shiftType", shift.getShiftType());
        row.put("requiredWorkers", shift.getRequiredWorkers());
        row.put("requiredCertId", shift.getRequiredCertId());
        row.put("status", shift.getStatus());
        row.put("createdBy", shift.getCreatedBy());
        row.put("publishedAt", shift.getPublishedAt());
        return row;
    }
}
