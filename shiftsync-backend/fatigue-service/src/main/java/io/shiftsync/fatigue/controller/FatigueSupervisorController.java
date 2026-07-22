package io.shiftsync.fatigue.controller;

import io.shiftsync.fatigue.domain.FatigueScore;
import io.shiftsync.fatigue.domain.RiskLevel;
import io.shiftsync.fatigue.service.FatigueService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;

/** GET /v1/supervisor/fatigue-alerts — mock contract for supervisor alert board. */
@RestController
@RequestMapping("/v1/supervisor")
public class FatigueSupervisorController {

    private final FatigueService fatigueService;

    public FatigueSupervisorController(FatigueService fatigueService) {
        this.fatigueService = fatigueService;
    }

    @GetMapping("/fatigue-alerts")
    public ResponseEntity<List<FatigueScore>> listAlerts() {
        List<FatigueScore> alerts = fatigueService.listSupervisorAlerts();
        alerts.sort(Comparator.comparing((FatigueScore f) ->
                f.getRiskLevel() == RiskLevel.CRITICAL ? 0 : 1));
        return ResponseEntity.ok(alerts);
    }
}
