package io.shiftsync.emergency.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.UUID;

@FeignClient(name = "attendance-service", url = "${app.clients.attendance-service.url:http://localhost:8084}")
public interface AttendanceServiceClient {
    
    @GetMapping("/v1/attendance/active")
    List<UUID> getActiveWorkers(@RequestParam("zone") UUID zone);
}
