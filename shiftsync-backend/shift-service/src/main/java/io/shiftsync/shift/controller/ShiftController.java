package io.shiftsync.shift.controller;

import io.shiftsync.shift.domain.Shift;
import io.shiftsync.shift.domain.ShiftAssignment;
import io.shiftsync.shift.repository.ShiftAssignmentRepository;
import io.shiftsync.shift.repository.ShiftRepository;
import io.shiftsync.shift.service.ConflictDetector;
import io.shiftsync.shift.service.ExportService;
import io.shiftsync.shift.service.ShiftWorkflowService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/shifts")
public class ShiftController {

    private final ShiftRepository shiftRepository;
    private final ShiftWorkflowService workflowService;
    private final ExportService exportService;
    private final ConflictDetector conflictDetector;
    private final ShiftAssignmentRepository assignmentRepository;

    public ShiftController(ShiftRepository shiftRepository, 
                           ShiftWorkflowService workflowService, 
                           ExportService exportService,
                           ConflictDetector conflictDetector,
                           ShiftAssignmentRepository assignmentRepository) {
        this.shiftRepository = shiftRepository;
        this.workflowService = workflowService;
        this.exportService = exportService;
        this.conflictDetector = conflictDetector;
        this.assignmentRepository = assignmentRepository;
    }

    @PostMapping
    public ResponseEntity<?> createShift(@RequestHeader("X-User-Id") String userId, @RequestBody Shift shift) {
        shift.setId(UUID.randomUUID());
        shift.setCreatedBy(UUID.fromString(userId));
        shift.setStatus(io.shiftsync.shift.domain.ShiftStatus.DRAFT);
        return ResponseEntity.ok(shiftRepository.save(shift));
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<?> publishShift(@PathVariable UUID id, @RequestHeader("X-User-Id") String userId) {
        workflowService.publishShift(id, UUID.fromString(userId));
        return ResponseEntity.ok(Map.of("status", "PUBLISHED"));
    }
    
    @PostMapping("/{id}/assignments")
    public ResponseEntity<?> assignWorker(@PathVariable UUID id, @RequestBody Map<String, Object> request) {
        @SuppressWarnings("unchecked")
        List<String> userIds = request.containsKey("userIds")
                ? (List<String>) request.get("userIds")
                : List.of((String) request.get("userId"));

        Shift shift = shiftRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Shift not found"));
        boolean override = Boolean.parseBoolean(String.valueOf(request.getOrDefault("overrideFatigue", "false")));

        List<ShiftAssignment> created = new java.util.ArrayList<>();
        for (String userIdStr : userIds) {
            UUID workerId = UUID.fromString(userIdStr);
            conflictDetector.verifyAssignmentAllowed(shift, workerId, override);
            ShiftAssignment assignment = new ShiftAssignment();
            assignment.setId(UUID.randomUUID());
            assignment.setShiftId(id);
            assignment.setUserId(workerId);
            created.add(assignmentRepository.save(assignment));
        }
        return ResponseEntity.ok(created.size() == 1 ? created.get(0) : Map.of("success", true));
    }

    /** Alias: POST /v1/shifts/{assignmentId}/confirm (mobile contract). */
    @PostMapping("/{assignmentId}/confirm")
    public ResponseEntity<?> confirmAssignmentAlias(@PathVariable UUID assignmentId, @RequestHeader("X-User-Id") String userId) {
        workflowService.confirmAssignment(assignmentId, UUID.fromString(userId));
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/assignments/{assignmentId}/confirm")
    public ResponseEntity<?> confirmAssignment(@PathVariable UUID assignmentId, @RequestHeader("X-User-Id") String userId) {
        workflowService.confirmAssignment(assignmentId, UUID.fromString(userId));
        return ResponseEntity.ok(Map.of("status", "CONFIRMED"));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportShifts(
            @RequestParam UUID departmentId,
            @RequestParam Instant start,
            @RequestParam Instant end,
            @RequestParam(defaultValue = "csv") String format) {
        
        if ("pdf".equalsIgnoreCase(format)) {
            byte[] pdfBytes = exportService.exportShiftsToPdf(departmentId, start, end);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=shifts.pdf")
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdfBytes);
        } else {
            byte[] csvBytes = exportService.exportShiftsToCsv(departmentId, start, end);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=shifts.csv")
                    .contentType(MediaType.parseMediaType("text/csv"))
                    .body(csvBytes);
        }
    }
}
