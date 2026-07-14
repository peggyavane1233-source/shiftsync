package io.shiftsync.emergency.service;

import io.shiftsync.emergency.client.AttendanceServiceClient;
import io.shiftsync.emergency.domain.EmergencyMuster;
import io.shiftsync.emergency.domain.MusterResponse;
import io.shiftsync.emergency.domain.MusterStatus;
import io.shiftsync.emergency.domain.ResponseStatus;
import io.shiftsync.emergency.repository.EmergencyMusterRepository;
import io.shiftsync.emergency.repository.MusterResponseRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class MusterService {

    private final EmergencyMusterRepository musterRepository;
    private final MusterResponseRepository responseRepository;
    private final AttendanceServiceClient attendanceClient;
    private final SimpMessagingTemplate messagingTemplate;

    public MusterService(EmergencyMusterRepository musterRepository,
                         MusterResponseRepository responseRepository,
                         AttendanceServiceClient attendanceClient,
                         SimpMessagingTemplate messagingTemplate) {
        this.musterRepository = musterRepository;
        this.responseRepository = responseRepository;
        this.attendanceClient = attendanceClient;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public EmergencyMuster initiateMuster(UUID zone, UUID initiatorId) {
        // Prevent multiple active musters per zone
        List<EmergencyMuster> active = musterRepository.findByZoneAndStatus(zone, MusterStatus.ACTIVE);
        if (!active.isEmpty()) {
            throw new IllegalStateException("An active muster already exists for this zone");
        }

        // Snapshot expected workers from attendance service
        List<UUID> activeWorkers = attendanceClient.getActiveWorkers(zone);

        EmergencyMuster muster = new EmergencyMuster();
        muster.setId(UUID.randomUUID());
        muster.setZone(zone);
        muster.setInitiatedBy(initiatorId);
        muster.setInitiatedAt(Instant.now());
        muster.setStatus(MusterStatus.ACTIVE);
        muster.setExpectedWorkers(activeWorkers.size());
        muster.setAccountedWorkers(0);

        musterRepository.save(muster);

        // Generate UNACCOUNTED responses for all expected workers
        for (UUID userId : activeWorkers) {
            MusterResponse response = new MusterResponse();
            response.setId(UUID.randomUUID());
            response.setMusterId(muster.getId());
            response.setUserId(userId);
            response.setStatus(ResponseStatus.UNACCOUNTED);
            responseRepository.save(response);
        }

        // Broadcast initial state
        broadcast(muster.getId(), muster);

        return muster;
    }

    @Transactional
    public MusterResponse respond(UUID musterId, UUID userId, UUID markedBy) {
        EmergencyMuster muster = musterRepository.findByIdAndStatus(musterId, MusterStatus.ACTIVE)
                .orElseThrow(() -> new IllegalArgumentException("Muster not found or already closed"));

        MusterResponse response = responseRepository.findByMusterIdAndUserId(musterId, userId)
                .orElse(null);

        // If a worker wasn't in the initial snapshot but reports anyway, we add them
        if (response == null) {
            response = new MusterResponse();
            response.setId(UUID.randomUUID());
            response.setMusterId(musterId);
            response.setUserId(userId);
            // Increment expected since they weren't in the original snapshot
            muster.setExpectedWorkers(muster.getExpectedWorkers() + 1);
        } else if (response.getStatus() == ResponseStatus.PRESENT) {
            return response; // Already accounted for
        }

        response.setStatus(ResponseStatus.PRESENT);
        response.setRespondedAt(Instant.now());
        response.setMarkedBy(markedBy);
        responseRepository.save(response);

        muster.setAccountedWorkers(muster.getAccountedWorkers() + 1);
        musterRepository.save(muster);

        broadcast(muster.getId(), muster);

        return response;
    }

    @Transactional
    public EmergencyMuster closeMuster(UUID musterId) {
        EmergencyMuster muster = musterRepository.findByIdAndStatus(musterId, MusterStatus.ACTIVE)
                .orElseThrow(() -> new IllegalArgumentException("Muster not found or already closed"));

        muster.setStatus(MusterStatus.CLOSED);
        muster.setClosedAt(Instant.now());
        musterRepository.save(muster);

        broadcast(muster.getId(), muster);

        return muster;
    }

    private void broadcast(UUID musterId, EmergencyMuster muster) {
        messagingTemplate.convertAndSend("/topic/musters/" + musterId, muster);
    }
    
    public EmergencyMuster getMuster(UUID id) {
        return musterRepository.findById(id).orElse(null);
    }
}
