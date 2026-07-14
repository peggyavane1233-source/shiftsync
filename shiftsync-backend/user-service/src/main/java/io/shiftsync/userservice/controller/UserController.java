package io.shiftsync.userservice.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/users")
public class UserController {

    @GetMapping("/{id}")
    public ResponseEntity<?> getUser(@PathVariable UUID id) {
        // Mocked response for scaffolding
        return ResponseEntity.ok(Map.of("id", id, "displayName", "User Name", "role", "WORKER"));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable UUID id, @RequestBody Map<String, Object> updates) {
        return ResponseEntity.ok(Map.of("status", "updated", "id", id));
    }

    @PostMapping("/me/devices")
    public ResponseEntity<?> registerDevice(@RequestHeader("X-User-Id") String userId, 
                                            @RequestBody DeviceRegistrationRequest request) {
        // Business Rule: ONE active device per worker. 
        // 1. Deactivate old devices for this user
        // 2. Register new device
        // 3. Log to audit_log
        return ResponseEntity.ok(Map.of("status", "registered", "deviceId", request.deviceId()));
    }

    public record DeviceRegistrationRequest(String deviceId, String pushToken) {}
}
