package io.shiftsync.attendance.service;

import io.shiftsync.attendance.client.FatigueServiceClient;
import io.shiftsync.attendance.client.ShiftServiceClient;
import io.shiftsync.attendance.client.UserServiceClient;
import io.shiftsync.attendance.domain.AttendanceRecord;
import io.shiftsync.attendance.repository.AttendanceRecordRepository;
import io.shiftsync.attendance.repository.OutboxEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AttendanceServiceTest {

    @Mock private AttendanceRecordRepository repository;
    @Mock private OutboxEventRepository outboxRepo;
    @Mock private QRService qrService;
    @Mock private ShiftServiceClient shiftClient;
    @Mock private UserServiceClient userClient;
    @Mock private FatigueServiceClient fatigueClient;
    @Mock private RedisTemplate<String, Object> redisTemplate;
    @Mock private ValueOperations<String, Object> valueOps;
    private ObjectMapper objectMapper = new ObjectMapper();

    private AttendanceService service;
    private AttendanceService.CheckInRequest validReq;
    private UUID testClientUuid;

    @BeforeEach
    void setUp() {
        service = new AttendanceService(repository, outboxRepo, qrService, shiftClient, userClient, fatigueClient, redisTemplate, objectMapper);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);

        testClientUuid = UUID.randomUUID();
        validReq = new AttendanceService.CheckInRequest(
                testClientUuid, UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
                "QR", Instant.now(), false, "device1", "validToken", 0, 0, false
        );
    }

    @Test
    void testConcurrentReplay_exactlyOneRowInserted() throws InterruptedException {
        // Setup mock so the first call saves successfully, subsequent throw DataIntegrityViolationException
        when(repository.findByClientUuid(testClientUuid)).thenReturn(Optional.empty());
        
        AttendanceRecord mockRecord = new AttendanceRecord();
        when(repository.saveAndFlush(any(AttendanceRecord.class)))
            .thenReturn(mockRecord)
            .thenThrow(new DataIntegrityViolationException("duplicate key"));
            
        when(repository.findByClientUuid(testClientUuid))
            .thenReturn(Optional.empty()) // initial check
            .thenReturn(Optional.of(mockRecord)); // recovery check
            
        when(qrService.validateQR(anyString(), any())).thenReturn(true);
        when(shiftClient.verifyAssignment(any(), any())).thenReturn(true);
        when(fatigueClient.getLatestScore(any())).thenReturn(new FatigueServiceClient.FatigueScoreResponse(UUID.randomUUID(), 0, "LOW", ""));

        int threads = 100;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        AtomicInteger successCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                try {
                    latch.await();
                    service.checkIn(validReq);
                    successCount.incrementAndGet();
                } catch (Exception ignored) {
                } finally {
                    done.countDown();
                }
            });
        }

        latch.countDown(); // start all threads at once
        done.await();

        assertEquals(100, successCount.get(), "All 100 requests should succeed returning 200 OK");
        verify(repository, times(100)).saveAndFlush(any());
        // Validation logic should only run ONCE because the other 99 are caught and returned early
        verify(shiftClient, times(1)).verifyAssignment(any(), any());
    }

    @Test
    void testQRExpiry_Tplus91s() {
        when(repository.findByClientUuid(testClientUuid)).thenReturn(Optional.empty());
        
        // Mock QR validation failing
        when(qrService.validateQR("expiredToken", validReq.shiftId())).thenReturn(false);
        
        AttendanceService.CheckInRequest expiredReq = new AttendanceService.CheckInRequest(
                testClientUuid, UUID.randomUUID(), validReq.shiftId(), UUID.randomUUID(),
                "QR", Instant.now().minusSeconds(91), false, "device1", "expiredToken", 0, 0, false
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> service.checkIn(expiredReq));
        assertEquals("QR_EXPIRED", ex.getMessage());
    }
}
