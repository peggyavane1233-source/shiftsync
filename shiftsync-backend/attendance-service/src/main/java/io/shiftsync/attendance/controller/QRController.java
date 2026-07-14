package io.shiftsync.attendance.controller;

import io.shiftsync.attendance.service.QRService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/v1/attendance/qr")
public class QRController {

    private final QRService qrService;

    public QRController(QRService qrService) {
        this.qrService = qrService;
    }

    @PostMapping("/generate")
    public ResponseEntity<QRService.QRGenerationResult> generateQR(@RequestBody QRRequest request) {
        return ResponseEntity.ok(qrService.generateQR(request.shiftId()));
    }

    public record QRRequest(UUID shiftId) {}
}
