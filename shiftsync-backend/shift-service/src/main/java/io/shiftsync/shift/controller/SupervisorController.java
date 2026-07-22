package io.shiftsync.shift.controller;

import io.shiftsync.shift.domain.Shift;
import io.shiftsync.shift.domain.ShiftAssignment;
import io.shiftsync.shift.repository.ShiftAssignmentRepository;
import io.shiftsync.shift.repository.ShiftRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/v1/supervisor")
public class SupervisorController {

    private final ShiftRepository shiftRepository;
    private final ShiftAssignmentRepository assignmentRepository;

    public SupervisorController(ShiftRepository shiftRepository, ShiftAssignmentRepository assignmentRepository) {
        this.shiftRepository = shiftRepository;
        this.assignmentRepository = assignmentRepository;
    }

    /** GET /v1/supervisor/shifts — shifts for supervisor's department with assignments. */
    @GetMapping("/shifts")
    public ResponseEntity<List<Map<String, Object>>> listShifts(@RequestHeader("X-Dept-Id") String deptIdHeader) {
        if (deptIdHeader == null || deptIdHeader.isBlank()) {
            return ResponseEntity.ok(List.of());
        }
        UUID departmentId = UUID.fromString(deptIdHeader);
        List<Shift> shifts = shiftRepository.findByDepartmentId(departmentId);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Shift shift : shifts) {
            List<ShiftAssignment> assignments = assignmentRepository.findByShiftId(shift.getId());
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
            row.put("assignments", assignments.stream().map(this::toAssignmentMap).toList());
            row.put("attendance", List.of());
            result.add(row);
        }
        return ResponseEntity.ok(result);
    }

    private Map<String, Object> toAssignmentMap(ShiftAssignment a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.getId());
        m.put("shiftId", a.getShiftId());
        m.put("userId", a.getUserId());
        m.put("status", a.getStatus());
        m.put("assignedAt", a.getAssignedAt());
        m.put("confirmedAt", a.getConfirmedAt());
        return m;
    }
}
