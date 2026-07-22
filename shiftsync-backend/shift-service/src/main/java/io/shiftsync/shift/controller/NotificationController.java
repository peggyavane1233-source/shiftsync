package io.shiftsync.shift.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/v1/notifications")
public class NotificationController {

    private final JdbcTemplate jdbc;

    public NotificationController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** GET /v1/notifications — mock contract: user's notifications newest first. */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> mine(@RequestHeader("X-User-Id") String userId) {
        List<Map<String, Object>> rows = jdbc.query("""
                SELECT id, user_id, type, channel, title, message, payload,
                       sent_at, delivered_at, acknowledged_at, escalated_at
                FROM notifications
                WHERE user_id = ?::uuid
                ORDER BY COALESCE(sent_at, now()) DESC
                """,
                (rs, rowNum) -> {
                    Map<String, Object> n = new LinkedHashMap<>();
                    n.put("id", rs.getObject("id", UUID.class));
                    n.put("userId", rs.getObject("user_id", UUID.class));
                    n.put("type", rs.getString("type"));
                    n.put("channel", rs.getString("channel"));
                    n.put("title", rs.getString("title"));
                    n.put("message", rs.getString("message"));
                    n.put("payload", rs.getString("payload"));
                    n.put("sentAt", toIso(rs.getTimestamp("sent_at")));
                    n.put("deliveredAt", toIso(rs.getTimestamp("delivered_at")));
                    n.put("acknowledgedAt", toIso(rs.getTimestamp("acknowledged_at")));
                    n.put("escalatedAt", toIso(rs.getTimestamp("escalated_at")));
                    return n;
                },
                userId);
        return ResponseEntity.ok(rows);
    }

    /** POST /v1/notifications/{id}/confirm */
    @PostMapping("/{id}/confirm")
    public ResponseEntity<Map<String, Object>> confirm(
            @PathVariable UUID id,
            @RequestHeader("X-User-Id") String userId) {
        int updated = jdbc.update("""
                UPDATE notifications
                SET acknowledged_at = now()
                WHERE id = ? AND user_id = ?::uuid
                """, id, userId);
        if (updated == 0) return ResponseEntity.notFound().build();
        List<Map<String, Object>> rows = jdbc.query("""
                SELECT id, user_id, type, channel, title, message, payload,
                       sent_at, delivered_at, acknowledged_at, escalated_at
                FROM notifications WHERE id = ?
                """,
                (rs, rowNum) -> {
                    Map<String, Object> n = new LinkedHashMap<>();
                    n.put("id", rs.getObject("id", UUID.class));
                    n.put("userId", rs.getObject("user_id", UUID.class));
                    n.put("type", rs.getString("type"));
                    n.put("channel", rs.getString("channel"));
                    n.put("title", rs.getString("title"));
                    n.put("message", rs.getString("message"));
                    n.put("payload", rs.getString("payload"));
                    n.put("sentAt", toIso(rs.getTimestamp("sent_at")));
                    n.put("deliveredAt", toIso(rs.getTimestamp("delivered_at")));
                    n.put("acknowledgedAt", toIso(rs.getTimestamp("acknowledged_at")));
                    n.put("escalatedAt", toIso(rs.getTimestamp("escalated_at")));
                    return n;
                },
                id);
        return rows.isEmpty() ? ResponseEntity.notFound().build() : ResponseEntity.ok(rows.get(0));
    }

    private static String toIso(java.sql.Timestamp ts) {
        return ts != null ? ts.toInstant().toString() : null;
    }
}
