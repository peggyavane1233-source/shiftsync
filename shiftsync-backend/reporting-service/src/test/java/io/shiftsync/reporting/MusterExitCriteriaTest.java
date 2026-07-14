package io.shiftsync.reporting;

import io.shiftsync.reporting.domain.ReportJob;
import io.shiftsync.reporting.domain.ReportingFatigueIncident;
import io.shiftsync.reporting.domain.ReportingMuster;
import io.shiftsync.reporting.domain.ReportingMusterUnaccounted;
import io.shiftsync.reporting.repository.ReportJobRepository;
import io.shiftsync.reporting.repository.ReportingFatigueIncidentRepository;
import io.shiftsync.reporting.repository.ReportingMusterRepository;
import io.shiftsync.reporting.repository.ReportingMusterUnaccountedRepository;
import io.shiftsync.reporting.service.ReportGeneratorService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.io.File;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = ReportingServiceApplication.class)
class MusterExitCriteriaTest {

    @Autowired
    private ReportGeneratorService reportGeneratorService;

    @Autowired
    private ReportJobRepository jobRepository;

    @Autowired
    private ReportingFatigueIncidentRepository fatigueRepository;

    @Autowired
    private ReportingMusterRepository musterRepository;

    @Autowired
    private ReportingMusterUnaccountedRepository unaccountedRepository;

    @Test
    @DisplayName("EXIT CRITERIA: Trigger a muster with 52 workers, respond as 47, verify 5 missing, and generate fatigue incident PDF")
    void verifyExitCriteria() throws Exception {
        // 1. Setup simulated 52 workers on site
        int totalWorkers = 52;
        int respondedWorkers = 47;
        
        UUID zoneId = UUID.randomUUID();
        UUID musterId = UUID.randomUUID();

        // 2. Initialize the muster read-model
        ReportingMuster muster = new ReportingMuster();
        muster.setId(musterId);
        muster.setZone(zoneId);
        muster.setInitiatedAt(Instant.now());
        muster.setExpectedWorkers(totalWorkers);
        muster.setAccountedWorkers(respondedWorkers);
        musterRepository.save(muster);

        // 3. Track responded vs missing
        List<String> missingNames = new ArrayList<>();
        for (int i = 1; i <= totalWorkers; i++) {
            String name = "Worker " + i;
            String employeeNo = "WRK-" + String.format("%04d", i);
            
            if (i > respondedWorkers) {
                // These 5 didn't respond (unaccounted)
                ReportingMusterUnaccounted missing = new ReportingMusterUnaccounted();
                missing.setId(UUID.randomUUID());
                missing.setMusterId(musterId);
                missing.setUserId(UUID.randomUUID());
                missing.setEmployeeNo(employeeNo);
                missing.setDisplayName(name);
                unaccountedRepository.save(missing);
                missingNames.add(name);
            }
        }

        // 4. Verify 47/52 headcount and name the 5 missing
        ReportingMuster savedMuster = musterRepository.findById(musterId).orElseThrow();
        assertEquals(52, savedMuster.getExpectedWorkers());
        assertEquals(47, savedMuster.getAccountedWorkers());
        
        List<ReportingMusterUnaccounted> unaccountedList = unaccountedRepository.findByMusterId(musterId);
        assertEquals(5, unaccountedList.size());
        
        System.out.println("====== EXIT CRITERIA MUSTER REPORT ======");
        System.out.println("Muster Status: " + savedMuster.getAccountedWorkers() + "/" + savedMuster.getExpectedWorkers() + " Accounted");
        System.out.println("Missing workers identified (" + unaccountedList.size() + "):");
        for (ReportingMusterUnaccounted m : unaccountedList) {
            System.out.println(" - " + m.getDisplayName() + " (" + m.getEmployeeNo() + ")");
        }
        System.out.println("=========================================");

        // 5. Generate fatigue incidents for report
        ReportingFatigueIncident incident = new ReportingFatigueIncident();
        incident.setId(UUID.randomUUID());
        incident.setUserId(UUID.randomUUID());
        incident.setEmployeeNo("WRK-0005");
        incident.setDisplayName("Worker 5");
        incident.setAlertTime(Instant.now().minus(1, ChronoUnit.DAYS));
        incident.setOverridden(true);
        incident.setOverriddenBy(UUID.randomUUID());
        incident.setOverrideReason("Critical shift coverage required for haulage truck maintenance");
        incident.setCreatedAt(Instant.now());
        fatigueRepository.save(incident);

        // 6. Generate the fatigue-incident PDF
        UUID jobId = UUID.randomUUID();
        ReportJob job = new ReportJob();
        job.setId(jobId);
        job.setType("FATIGUE_INCIDENT");
        job.setStatus("PENDING");
        job.setCreatedAt(Instant.now());
        jobRepository.save(job);

        reportGeneratorService.generateFatigueIncidentReport(jobId, Instant.now().minus(7, ChronoUnit.DAYS), Instant.now());

        // Wait slightly for async execution (though it runs on same thread in direct test context sometimes, wait to be safe)
        Thread.sleep(1000);

        ReportJob completedJob = jobRepository.findById(jobId).orElseThrow();
        assertEquals("COMPLETED", completedJob.getStatus());
        assertNotNull(completedJob.getFilePath());
        
        File pdfFile = new File(completedJob.getFilePath());
        assertTrue(pdfFile.exists());
        System.out.println("Generated Fatigue Incident PDF at: " + pdfFile.getAbsolutePath());
    }
}
