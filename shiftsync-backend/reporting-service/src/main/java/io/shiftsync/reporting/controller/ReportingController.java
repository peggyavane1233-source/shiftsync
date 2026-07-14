package io.shiftsync.reporting.controller;

import io.shiftsync.reporting.domain.ReportJob;
import io.shiftsync.reporting.domain.ReportingFatigueIncident;
import io.shiftsync.reporting.domain.ReportingMuster;
import io.shiftsync.reporting.domain.ReportingMusterUnaccounted;
import io.shiftsync.reporting.repository.ReportJobRepository;
import io.shiftsync.reporting.repository.ReportingFatigueIncidentRepository;
import io.shiftsync.reporting.repository.ReportingMusterRepository;
import io.shiftsync.reporting.repository.ReportingMusterUnaccountedRepository;
import io.shiftsync.reporting.service.ReportGeneratorService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/reports")
public class ReportingController {

    private final ReportJobRepository jobRepository;
    private final ReportGeneratorService generatorService;
    private final ReportingFatigueIncidentRepository fatigueRepository;
    private final ReportingMusterRepository musterRepository;
    private final ReportingMusterUnaccountedRepository unaccountedRepository;

    public ReportingController(ReportJobRepository jobRepository,
                               ReportGeneratorService generatorService,
                               ReportingFatigueIncidentRepository fatigueRepository,
                               ReportingMusterRepository musterRepository,
                               ReportingMusterUnaccountedRepository unaccountedRepository) {
        this.jobRepository = jobRepository;
        this.generatorService = generatorService;
        this.fatigueRepository = fatigueRepository;
        this.musterRepository = musterRepository;
        this.unaccountedRepository = unaccountedRepository;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> requestReport(@RequestBody ReportRequest request) {
        ReportJob job = new ReportJob();
        job.setId(UUID.randomUUID());
        job.setType(request.type());
        job.setStatus("PENDING");
        job.setCreatedAt(Instant.now());
        job.setParameters("Start: " + request.start() + ", End: " + request.end());
        jobRepository.save(job);

        Instant startInstant = request.start() != null ? request.start() : Instant.now().minus(30, ChronoUnit.DAYS);
        Instant endInstant = request.end() != null ? request.end() : Instant.now();

        if ("FATIGUE_INCIDENT".equalsIgnoreCase(request.type())) {
            generatorService.generateFatigueIncidentReport(job.getId(), startInstant, endInstant);
        } else if ("MUSTER_HISTORY".equalsIgnoreCase(request.type())) {
            generatorService.generateMusterHistoryReport(job.getId(), startInstant, endInstant);
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Unknown report type: " + request.type()));
        }

        return ResponseEntity.ok(Map.of("jobId", job.getId(), "status", job.getStatus()));
    }

    @GetMapping("/{jobId}")
    public ResponseEntity<ReportJob> getReportStatus(@PathVariable UUID jobId) {
        return jobRepository.findById(jobId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{jobId}/download")
    public ResponseEntity<Resource> downloadReport(@PathVariable UUID jobId) {
        ReportJob job = jobRepository.findById(jobId).orElse(null);
        if (job == null || !"COMPLETED".equals(job.getStatus()) || job.getFilePath() == null) {
            return ResponseEntity.badRequest().build();
        }

        File file = new File(job.getFilePath());
        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new FileSystemResource(file);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getName() + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(resource);
    }

    @PostMapping("/seed")
    public ResponseEntity<Map<String, String>> seedSampleData() {
        fatigueRepository.deleteAll();
        musterRepository.deleteAll();
        unaccountedRepository.deleteAll();

        // Seed 3 fatigue incidents
        for (int i = 1; i <= 3; i++) {
            ReportingFatigueIncident incident = new ReportingFatigueIncident();
            incident.setId(UUID.randomUUID());
            incident.setUserId(UUID.randomUUID());
            incident.setEmployeeNo("EMP-00" + i);
            incident.setDisplayName("Worker " + i);
            incident.setAlertTime(Instant.now().minus(i, ChronoUnit.DAYS));
            incident.setOverridden(i % 2 == 0);
            if (incident.isOverridden()) {
                incident.setOverriddenBy(UUID.randomUUID());
                incident.setOverrideReason("Required for critical machinery maintenance under supervision");
            }
            incident.setCreatedAt(Instant.now());
            fatigueRepository.save(incident);
        }

        // Seed a sample muster history record
        ReportingMuster muster = new ReportingMuster();
        muster.setId(UUID.randomUUID());
        muster.setZone(UUID.randomUUID());
        muster.setInitiatedAt(Instant.now().minus(2, ChronoUnit.HOURS));
        muster.setClosedAt(Instant.now().minus(1, ChronoUnit.HOURS));
        muster.setExpectedWorkers(52);
        muster.setAccountedWorkers(47);
        muster.setTimeToFullHeadcountSeconds(null); // Never completed since 5 unaccounted
        musterRepository.save(muster);

        // Seed 5 missing workers
        for (int i = 1; i <= 5; i++) {
            ReportingMusterUnaccounted unaccounted = new ReportingMusterUnaccounted();
            unaccounted.setId(UUID.randomUUID());
            unaccounted.setMusterId(muster.getId());
            unaccounted.setUserId(UUID.randomUUID());
            unaccounted.setEmployeeNo("MISSING-00" + i);
            unaccounted.setDisplayName("Missing Worker " + i);
            unaccountedRepository.save(unaccounted);
        }

        return ResponseEntity.ok(Map.of("message", "Reporting data seeded successfully"));
    }

    public record ReportRequest(String type, Instant start, Instant end) {}
}
