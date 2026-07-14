package io.shiftsync.emergency.service;

import io.shiftsync.emergency.client.AttendanceServiceClient;
import io.shiftsync.emergency.domain.EmergencyMuster;
import io.shiftsync.emergency.domain.MusterResponse;
import io.shiftsync.emergency.domain.MusterStatus;
import io.shiftsync.emergency.domain.ResponseStatus;
import io.shiftsync.emergency.repository.EmergencyMusterRepository;
import io.shiftsync.emergency.repository.MusterResponseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MusterServiceTest {

    private EmergencyMusterRepository musterRepository;
    private MusterResponseRepository responseRepository;
    private AttendanceServiceClient attendanceClient;
    private SimpMessagingTemplate messagingTemplate;
    private MusterService musterService;

    @BeforeEach
    void setUp() {
        musterRepository = mock(EmergencyMusterRepository.class);
        responseRepository = mock(MusterResponseRepository.class);
        attendanceClient = mock(AttendanceServiceClient.class);
        messagingTemplate = mock(SimpMessagingTemplate.class);
        musterService = new MusterService(musterRepository, responseRepository, attendanceClient, messagingTemplate);
    }

    @Test
    @DisplayName("Initiating a muster snapshots expected workers and creates unaccounted responses")
    void initiateMuster() {
        UUID zone = UUID.randomUUID();
        UUID initiatorId = UUID.randomUUID();
        UUID worker1 = UUID.randomUUID();
        UUID worker2 = UUID.randomUUID();

        when(musterRepository.findByZoneAndStatus(zone, MusterStatus.ACTIVE)).thenReturn(List.of());
        when(attendanceClient.getActiveWorkers(zone)).thenReturn(List.of(worker1, worker2));
        
        when(musterRepository.save(any(EmergencyMuster.class))).thenAnswer(i -> i.getArgument(0));

        EmergencyMuster muster = musterService.initiateMuster(zone, initiatorId);

        assertEquals(2, muster.getExpectedWorkers());
        assertEquals(0, muster.getAccountedWorkers());
        assertEquals(MusterStatus.ACTIVE, muster.getStatus());
        assertEquals(initiatorId, muster.getInitiatedBy());

        ArgumentCaptor<MusterResponse> responseCaptor = ArgumentCaptor.forClass(MusterResponse.class);
        verify(responseRepository, times(2)).save(responseCaptor.capture());

        List<MusterResponse> savedResponses = responseCaptor.getAllValues();
        assertEquals(2, savedResponses.size());
        assertTrue(savedResponses.stream().allMatch(r -> r.getStatus() == ResponseStatus.UNACCOUNTED));
        
        verify(messagingTemplate).convertAndSend(eq("/topic/musters/" + muster.getId()), any(EmergencyMuster.class));
    }

    @Test
    @DisplayName("Responding to a muster increments accounted count and updates response status")
    void respondToMuster() {
        UUID musterId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        EmergencyMuster muster = new EmergencyMuster();
        muster.setId(musterId);
        muster.setExpectedWorkers(10);
        muster.setAccountedWorkers(0);
        muster.setStatus(MusterStatus.ACTIVE);

        MusterResponse response = new MusterResponse();
        response.setId(UUID.randomUUID());
        response.setMusterId(musterId);
        response.setUserId(userId);
        response.setStatus(ResponseStatus.UNACCOUNTED);

        when(musterRepository.findByIdAndStatus(musterId, MusterStatus.ACTIVE)).thenReturn(Optional.of(muster));
        when(responseRepository.findByMusterIdAndUserId(musterId, userId)).thenReturn(Optional.of(response));

        MusterResponse updatedResponse = musterService.respond(musterId, userId, null);

        assertEquals(ResponseStatus.PRESENT, updatedResponse.getStatus());
        assertNotNull(updatedResponse.getRespondedAt());
        assertNull(updatedResponse.getMarkedBy());

        verify(responseRepository).save(updatedResponse);
        
        ArgumentCaptor<EmergencyMuster> musterCaptor = ArgumentCaptor.forClass(EmergencyMuster.class);
        verify(musterRepository).save(musterCaptor.capture());
        assertEquals(1, musterCaptor.getValue().getAccountedWorkers());
        
        verify(messagingTemplate).convertAndSend(eq("/topic/musters/" + musterId), any(EmergencyMuster.class));
    }

    @Test
    @DisplayName("Responding to a muster by an un-snapshotted worker increments expected and accounted counts")
    void respondUnexpectedWorker() {
        UUID musterId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        EmergencyMuster muster = new EmergencyMuster();
        muster.setId(musterId);
        muster.setExpectedWorkers(10);
        muster.setAccountedWorkers(0);
        muster.setStatus(MusterStatus.ACTIVE);

        when(musterRepository.findByIdAndStatus(musterId, MusterStatus.ACTIVE)).thenReturn(Optional.of(muster));
        when(responseRepository.findByMusterIdAndUserId(musterId, userId)).thenReturn(Optional.empty());

        MusterResponse newResponse = musterService.respond(musterId, userId, null);

        assertEquals(ResponseStatus.PRESENT, newResponse.getStatus());
        assertEquals(11, muster.getExpectedWorkers()); // Expected goes up
        assertEquals(1, muster.getAccountedWorkers()); // Accounted goes up
    }
}
