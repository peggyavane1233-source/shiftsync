package io.shiftsync.shift.service;

import io.shiftsync.shift.domain.OutboxEvent;
import io.shiftsync.shift.repository.OutboxEventRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class OutboxPoller {

    private final OutboxEventRepository outboxEventRepository;
    // In reality, this would use KafkaTemplate<String, String> kafkaTemplate
    
    public OutboxPoller(OutboxEventRepository outboxEventRepository) {
        this.outboxEventRepository = outboxEventRepository;
    }

    @Scheduled(fixedDelay = 5000)
    public void pollAndPublish() {
        List<OutboxEvent> pendingEvents = outboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING");
        
        for (OutboxEvent event : pendingEvents) {
            try {
                // Mocking kafka publish: kafkaTemplate.send(event.getEventType(), event.getPayload())
                System.out.println("Publishing to Kafka Topic: " + event.getEventType() + " Payload: " + event.getPayload());
                
                event.setStatus("SENT");
                event.setProcessedAt(Instant.now());
                outboxEventRepository.save(event);
            } catch (Exception e) {
                // In production, implement retry limit or dead-letter queue
                System.err.println("Failed to publish event: " + event.getId());
            }
        }
    }
}
