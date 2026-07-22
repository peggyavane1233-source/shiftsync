package io.shiftsync.userservice.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/v1/users")
public class UserController {

    private final JdbcTemplate jdbc;

    public UserController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** GET /v1/users — mock contract */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listUsers() {
        List<Map<String, Object>> rows = jdbc.query("""
                SELECT id, display_name, phone, role, department_id, employee_no, created_at, updated_at
                FROM user_profiles
                ORDER BY display_name
                """, (rs, rowNum) -> profileRow(rs));
        return ResponseEntity.ok(rows);
    }

    /** POST /v1/users — creates profile stub (auth account provisioning is separate). */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createUser(@RequestBody CreateUserBody body) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO user_profiles (id, display_name, role, department_id, employee_no)
                VALUES (?::uuid, ?, ?, ?::uuid, ?)
                """,
                id.toString(),
                body.displayName(),
                body.role(),
                body.departmentId(),
                body.employeeNo());
        List<Map<String, Object>> rows = jdbc.query("""
                SELECT id, display_name, phone, role, department_id, employee_no, created_at, updated_at
                FROM user_profiles WHERE id = ?::uuid
                """, (rs, rowNum) -> profileRow(rs), id.toString());
        Map<String, Object> created = rows.get(0);
        if (body.email() != null) created.put("email", body.email());
        created.put("isActive", true);
        return ResponseEntity.ok(created);
    }

    /** GET /v1/users/me/certs — mock contract */
    @GetMapping("/me/certs")
    public ResponseEntity<List<Map<String, Object>>> myCerts(@RequestHeader("X-User-Id") String userId) {
        List<Map<String, Object>> rows = jdbc.query("""
                SELECT c.id, c.name, c.description, c.expiry_days,
                       uc.issued_at, uc.expires_at, uc.is_active
                FROM user_certifications uc
                JOIN certifications c ON c.id = uc.cert_id
                WHERE uc.user_id = ?::uuid
                ORDER BY uc.expires_at DESC
                """,
                (rs, rowNum) -> {
                    Map<String, Object> cert = new LinkedHashMap<>();
                    cert.put("id", rs.getObject("id", UUID.class));
                    cert.put("name", rs.getString("name"));
                    cert.put("description", rs.getString("description"));
                    cert.put("expiryDays", rs.getInt("expiry_days"));
                    cert.put("issuedAt", rs.getDate("issued_at").toString());
                    cert.put("expiresAt", rs.getDate("expires_at").toString());
                    cert.put("isActive", rs.getBoolean("is_active"));
                    return cert;
                },
                userId);
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getUser(@PathVariable UUID id) {
        List<Map<String, Object>> rows = jdbc.query("""
                SELECT id, display_name, phone, role, department_id, employee_no, created_at, updated_at
                FROM user_profiles WHERE id = ?::uuid
                """, (rs, rowNum) -> profileRow(rs), id.toString());
        return rows.isEmpty() ? ResponseEntity.notFound().build() : ResponseEntity.ok(rows.get(0));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable UUID id, @RequestBody Map<String, Object> updates) {
        return ResponseEntity.ok(Map.of("status", "updated", "id", id));
    }

    @PostMapping("/me/devices")
    public ResponseEntity<?> registerDevice(@RequestHeader("X-User-Id") String userId,
                                            @RequestBody DeviceRegistrationRequest request) {
        String pushToken = request.token() != null ? request.token() : request.pushToken();
        String platform = request.platform() != null ? request.platform() : "expo";
        String deviceId = pushToken != null ? pushToken : UUID.randomUUID().toString();

        jdbc.update("UPDATE user_devices SET is_active = FALSE WHERE user_id = ?::uuid", userId);
        UUID deviceRowId = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO user_devices (id, user_id, device_id, push_token, is_active)
                VALUES (?::uuid, ?::uuid, ?, ?, TRUE)
                """, deviceRowId.toString(), userId, deviceId, pushToken);

        return ResponseEntity.ok(Map.of(
                "status", "registered",
                "userId", userId,
                "token", pushToken != null ? pushToken : "",
                "platform", platform
        ));
    }

    private static Map<String, Object> profileRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        Map<String, Object> u = new LinkedHashMap<>();
        u.put("id", rs.getObject("id", UUID.class));
        u.put("displayName", rs.getString("display_name"));
        u.put("phone", rs.getString("phone"));
        u.put("role", rs.getString("role"));
        u.put("departmentId", rs.getObject("department_id", UUID.class));
        u.put("employeeNo", rs.getString("employee_no"));
        u.put("isActive", true);
        u.put("createdAt", rs.getTimestamp("created_at").toInstant().toString());
        u.put("updatedAt", rs.getTimestamp("updated_at").toInstant().toString());
        return u;
    }

    public record CreateUserBody(String displayName, String email, String role, String employeeNo, String departmentId) {}
    public record DeviceRegistrationRequest(String token, String platform, String deviceId, String pushToken) {}
}
