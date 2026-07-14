package io.shiftsync.common.event;

import java.time.Instant;
import java.util.UUID;

public abstract class BaseEvent {
    private String eventId;
    private Instant occurredAt;
    private int version;

    public BaseEvent() {
        this.eventId = UUID.randomUUID().toString();
        this.occurredAt = Instant.now();
        this.version = 1;
    }

    public BaseEvent(String eventId, Instant occurredAt, int version) {
        this.eventId = eventId;
        this.occurredAt = occurredAt;
        this.version = version;
    }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public Instant getOccurredAt() { return occurredAt; }
    public void setOccurredAt(Instant occurredAt) { this.occurredAt = occurredAt; }

    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }
}
