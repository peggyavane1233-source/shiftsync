package io.shiftsync.reporting.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfWriter;
import io.shiftsync.reporting.domain.ReportJob;
import io.shiftsync.reporting.domain.ReportingFatigueIncident;
import io.shiftsync.reporting.domain.ReportingMuster;
import io.shiftsync.reporting.repository.ReportJobRepository;
import io.shiftsync.reporting.repository.ReportingFatigueIncidentRepository;
import io.shiftsync.reporting.repository.ReportingMusterRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileOutputStream;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class ReportGeneratorService {

    private final ReportJobRepository jobRepository;
    private final ReportingFatigueIncidentRepository fatigueRepository;
    private final ReportingMusterRepository musterRepository;

    public ReportGeneratorService(ReportJobRepository jobRepository,
                                  ReportingFatigueIncidentRepository fatigueRepository,
                                  ReportingMusterRepository musterRepository) {
        this.jobRepository = jobRepository;
        this.fatigueRepository = fatigueRepository;
        this.musterRepository = musterRepository;
    }

    @Async
    public void generateFatigueIncidentReport(UUID jobId, Instant start, Instant end) {
        ReportJob job = jobRepository.findById(jobId).orElse(null);
        if (job == null) return;

        job.setStatus("RUNNING");
        jobRepository.save(job);

        try {
            List<ReportingFatigueIncident> incidents = fatigueRepository.findByAlertTimeBetween(start, end);
            
            // Create reports directory if not exists
            File dir = new File("reports");
            if (!dir.exists()) {
                dir.mkdirs();
            }

            File file = new File(dir, "fatigue-incident-" + jobId + ".pdf");
            Document document = new Document();
            PdfWriter.getInstance(document, new FileOutputStream(file));
            
            document.open();
            
            // Styled Heading
            Font titleFont = new Font(Font.HELVETICA, 18, Font.BOLD);
            Paragraph title = new Paragraph("ShiftSync — Compliance Fatigue-Incident Report", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            // Subtitle / Date Range
            Font subtitleFont = new Font(Font.HELVETICA, 12, Font.ITALIC);
            Paragraph subtitle = new Paragraph("Date Range: " + start + " to " + end, subtitleFont);
            subtitle.setSpacingAfter(20);
            document.add(subtitle);

            if (incidents.isEmpty()) {
                document.add(new Paragraph("No critical fatigue incidents found for this period."));
            } else {
                // Table
                PdfPTable table = new PdfPTable(6);
                table.setWidthPercentage(100);
                table.setWidths(new float[]{1.5f, 2.5f, 2.0f, 1.0f, 1.5f, 3.0f});

                String[] headers = {"Employee No", "Name", "Alert Time", "Overridden", "Overridden By", "Reason"};
                Font headerFont = new Font(Font.HELVETICA, 10, Font.BOLD);
                for (String header : headers) {
                    PdfPCell cell = new PdfPCell(new Paragraph(header, headerFont));
                    cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                    table.addCell(cell);
                }

                Font cellFont = new Font(Font.HELVETICA, 9);
                for (ReportingFatigueIncident incident : incidents) {
                    table.addCell(new PdfPCell(new Paragraph(incident.getEmployeeNo(), cellFont)));
                    table.addCell(new PdfPCell(new Paragraph(incident.getDisplayName(), cellFont)));
                    table.addCell(new PdfPCell(new Paragraph(incident.getAlertTime().toString(), cellFont)));
                    table.addCell(new PdfPCell(new Paragraph(incident.isOverridden() ? "YES" : "NO", cellFont)));
                    table.addCell(new PdfPCell(new Paragraph(incident.getOverriddenBy() != null ? incident.getOverriddenBy().toString() : "N/A", cellFont)));
                    table.addCell(new PdfPCell(new Paragraph(incident.getOverrideReason() != null ? incident.getOverrideReason() : "N/A", cellFont)));
                }

                document.add(table);
            }

            document.close();

            job.setStatus("COMPLETED");
            job.setCompletedAt(Instant.now());
            job.setFilePath(file.getAbsolutePath());
            jobRepository.save(job);

        } catch (Exception e) {
            job.setStatus("FAILED");
            job.setErrorMessage(e.getMessage());
            jobRepository.save(job);
        }
    }

    @Async
    public void generateMusterHistoryReport(UUID jobId, Instant start, Instant end) {
        ReportJob job = jobRepository.findById(jobId).orElse(null);
        if (job == null) return;

        job.setStatus("RUNNING");
        jobRepository.save(job);

        try {
            List<ReportingMuster> musters = musterRepository.findByInitiatedAtBetween(start, end);
            
            File dir = new File("reports");
            if (!dir.exists()) {
                dir.mkdirs();
            }

            File file = new File(dir, "muster-history-" + jobId + ".pdf");
            Document document = new Document();
            PdfWriter.getInstance(document, new FileOutputStream(file));
            
            document.open();
            
            Font titleFont = new Font(Font.HELVETICA, 18, Font.BOLD);
            Paragraph title = new Paragraph("ShiftSync — Emergency Muster History Report", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            if (musters.isEmpty()) {
                document.add(new Paragraph("No muster events found for this period."));
            } else {
                PdfPTable table = new PdfPTable(6);
                table.setWidthPercentage(100);

                String[] headers = {"Muster ID", "Zone", "Initiated At", "Closed At", "Expected", "Accounted"};
                Font headerFont = new Font(Font.HELVETICA, 10, Font.BOLD);
                for (String header : headers) {
                    PdfPCell cell = new PdfPCell(new Paragraph(header, headerFont));
                    cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                    table.addCell(cell);
                }

                Font cellFont = new Font(Font.HELVETICA, 9);
                for (ReportingMuster muster : musters) {
                    table.addCell(new PdfPCell(new Paragraph(muster.getId().toString(), cellFont)));
                    table.addCell(new PdfPCell(new Paragraph(muster.getZone().toString(), cellFont)));
                    table.addCell(new PdfPCell(new Paragraph(muster.getInitiatedAt().toString(), cellFont)));
                    table.addCell(new PdfPCell(new Paragraph(muster.getClosedAt() != null ? muster.getClosedAt().toString() : "ACTIVE", cellFont)));
                    table.addCell(new PdfPCell(new Paragraph(String.valueOf(muster.getExpectedWorkers()), cellFont)));
                    table.addCell(new PdfPCell(new Paragraph(String.valueOf(muster.getAccountedWorkers()), cellFont)));
                }

                document.add(table);
            }

            document.close();

            job.setStatus("COMPLETED");
            job.setCompletedAt(Instant.now());
            job.setFilePath(file.getAbsolutePath());
            jobRepository.save(job);

        } catch (Exception e) {
            job.setStatus("FAILED");
            job.setErrorMessage(e.getMessage());
            jobRepository.save(job);
        }
    }
}
