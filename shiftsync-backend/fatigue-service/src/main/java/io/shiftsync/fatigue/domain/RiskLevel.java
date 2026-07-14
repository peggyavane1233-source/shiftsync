package io.shiftsync.fatigue.domain;

/**
 * Risk banding. These thresholds are mining-safety critical.
 * CRITICAL blocks check-in unless a supervisor overrides with a mandatory reason.
 */
public enum RiskLevel {
    LOW,        // score 0–39
    ADVISORY,   // score 40–59 — worker notified
    WARNING,    // score 60–79 — supervisor notified
    CRITICAL    // score 80–100 — check-in BLOCKED
}
