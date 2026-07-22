package io.shiftsync.shift.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/v1/tasks")
public class TaskController {

    private final JdbcTemplate jdbc;

    public TaskController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** POST /v1/tasks */
    @PostMapping
    public ResponseEntity<Map<String, Object>> create(
            @RequestHeader("X-User-Id") String supervisorId,
            @RequestBody CreateTaskBody body) {
        UUID id = UUID.randomUUID();
        Instant now = Instant.now();
        jdbc.update("""
                INSERT INTO tasks (id, title, assigned_user_id, assigned_by_user_id, status, created_at)
                VALUES (?, ?, ?::uuid, ?::uuid, 'PENDING', ?)
                """,
                id, body.title(), body.assignedUserId(), supervisorId, java.sql.Timestamp.from(now));
        return ResponseEntity.ok(Map.of(
                "id", id,
                "title", body.title(),
                "assignedUserId", body.assignedUserId(),
                "assignedByUserId", supervisorId,
                "status", "PENDING",
                "createdAt", now.toString()
        ));
    }

    /** GET /v1/tasks/mine */
    @GetMapping("/mine")
    public ResponseEntity<List<Map<String, Object>>> mine(@RequestHeader("X-User-Id") String userId) {
        List<Map<String, Object>> rows = jdbc.query("""
                SELECT id, title, assigned_user_id, assigned_by_user_id, status, created_at
                FROM tasks
                WHERE assigned_user_id = ?::uuid AND status <> 'COMPLETED'
                ORDER BY created_at DESC
                """,
                (rs, rowNum) -> taskRow(rs),
                userId);
        return ResponseEntity.ok(rows);
    }

    /** POST /v1/tasks/{id}/acknowledge */
    @PostMapping("/{id}/acknowledge")
    public ResponseEntity<Map<String, Object>> acknowledge(@PathVariable UUID id) {
        int updated = jdbc.update("UPDATE tasks SET status = 'ACKNOWLEDGED' WHERE id = ?", id);
        if (updated == 0) return ResponseEntity.notFound().build();
        List<Map<String, Object>> rows = jdbc.query("""
                SELECT id, title, assigned_user_id, assigned_by_user_id, status, created_at
                FROM tasks WHERE id = ?
                """, (rs, rowNum) -> taskRow(rs), id);
        return rows.isEmpty() ? ResponseEntity.notFound().build() : ResponseEntity.ok(rows.get(0));
    }

    private static Map<String, Object> taskRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        Map<String, Object> t = new LinkedHashMap<>();
        t.put("id", rs.getObject("id", UUID.class));
        t.put("title", rs.getString("title"));
        t.put("assignedUserId", rs.getObject("assigned_user_id", UUID.class));
        t.put("assignedByUserId", rs.getObject("assigned_by_user_id", UUID.class));
        t.put("status", rs.getString("status"));
        t.put("createdAt", rs.getTimestamp("created_at").toInstant().toString());
        return t;
    }

    public record CreateTaskBody(String title, String assignedUserId) {}
}
