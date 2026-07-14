package io.shiftsync.userservice.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/departments")
public class DepartmentController {

    @GetMapping
    public ResponseEntity<?> getDepartments() {
        return ResponseEntity.ok(java.util.List.of());
    }

    @PostMapping
    public ResponseEntity<?> createDepartment(@RequestHeader("X-User-Role") String role, 
                                              @RequestBody Map<String, Object> request) {
        if (!"ADMIN".equals(role)) {
            return ResponseEntity.status(403).body(Map.of("error", "Forbidden"));
        }
        return ResponseEntity.ok(Map.of("status", "created"));
    }
}
