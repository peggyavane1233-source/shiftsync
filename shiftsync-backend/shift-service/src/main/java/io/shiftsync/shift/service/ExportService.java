package io.shiftsync.shift.service;

import com.lowagie.text.Document;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import com.opencsv.CSVWriter;
import io.shiftsync.shift.domain.Shift;
import io.shiftsync.shift.repository.ShiftRepository;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class ExportService {

    private final ShiftRepository shiftRepository;

    public ExportService(ShiftRepository shiftRepository) {
        this.shiftRepository = shiftRepository;
    }

    public byte[] exportShiftsToPdf(UUID departmentId, Instant start, Instant end) {
        List<Shift> shifts = shiftRepository.findByDepartmentIdAndStartTimeBetween(departmentId, start, end);
        
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document();
            PdfWriter.getInstance(document, baos);
            document.open();
            
            document.add(new Paragraph("Shift Roster Export"));
            document.add(new Paragraph("Department: " + departmentId));
            document.add(new Paragraph("Period: " + start + " to " + end));
            document.add(new Paragraph(" "));
            
            for (Shift shift : shifts) {
                document.add(new Paragraph(String.format("Shift: %s | Start: %s | End: %s | Status: %s",
                        shift.getId(), shift.getStartTime(), shift.getEndTime(), shift.getStatus())));
            }
            
            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF", e);
        }
    }

    public byte[] exportShiftsToCsv(UUID departmentId, Instant start, Instant end) {
        List<Shift> shifts = shiftRepository.findByDepartmentIdAndStartTimeBetween(departmentId, start, end);
        
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             OutputStreamWriter writer = new OutputStreamWriter(baos);
             CSVWriter csvWriter = new CSVWriter(writer)) {
             
            String[] header = {"Shift ID", "Department ID", "Start Time", "End Time", "Type", "Status"};
            csvWriter.writeNext(header);
            
            for (Shift shift : shifts) {
                String[] row = {
                    shift.getId().toString(),
                    shift.getDepartmentId().toString(),
                    shift.getStartTime().toString(),
                    shift.getEndTime().toString(),
                    shift.getShiftType().name(),
                    shift.getStatus().name()
                };
                csvWriter.writeNext(row);
            }
            writer.flush();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate CSV", e);
        }
    }
}
