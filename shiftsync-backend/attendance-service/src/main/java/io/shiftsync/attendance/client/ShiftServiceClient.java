package io.shiftsync.attendance.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@FeignClient(name = "shift-service", url = "${app.clients.shift-service.url:http://localhost:8083}")
public interface ShiftServiceClient {

    @GetMapping("/v1/shifts/{shiftId}/assignments/{userId}/verify")
    boolean verifyAssignment(@PathVariable("shiftId") UUID shiftId, @PathVariable("userId") UUID userId);

    @GetMapping("/v1/shifts/internal/by-department/{deptId}")
    List<UUID> shiftIdsByDepartment(@PathVariable("deptId") UUID deptId);

    @GetMapping("/v1/shifts/internal/{shiftId}/assignments")
    List<Map<String, Object>> assignmentsForShift(@PathVariable("shiftId") UUID shiftId);
}
