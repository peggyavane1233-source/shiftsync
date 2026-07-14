package io.shiftsync.shift.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

@FeignClient(name = "fatigue-engine", url = "${app.clients.fatigue-engine.url:http://localhost:8000}")
public interface FatigueEngineClient {

    @GetMapping("/api/v1/fatigue/{userId}/latest")
    FatigueScoreResponse getLatestScore(@PathVariable("userId") UUID userId);

    record FatigueScoreResponse(UUID userId, int score, String riskLevel, String calculatedAt) {}
}
