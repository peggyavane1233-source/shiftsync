package io.shiftsync.attendance.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

/**
 * Feign client pointing at our own fatigue-service (Java Spring Boot),
 * not a third-party system. All calls stay inside ShiftSync.
 */
@FeignClient(name = "fatigue-service", url = "${app.clients.fatigue-service.url:http://localhost:8085}")
public interface FatigueServiceClient {

    @GetMapping("/v1/fatigue/{userId}/latest")
    FatigueScoreResponse getLatestScore(@PathVariable("userId") UUID userId);

    record FatigueScoreResponse(UUID userId, int score, String riskLevel, String calculatedAt) {}
}
