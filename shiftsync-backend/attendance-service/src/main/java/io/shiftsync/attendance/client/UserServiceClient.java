package io.shiftsync.attendance.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.UUID;

@FeignClient(name = "user-service", url = "${app.clients.user-service.url:http://localhost:8082}")
public interface UserServiceClient {

    @GetMapping("/v1/departments/{departmentId}/geofence-check")
    boolean checkGeofence(@PathVariable("departmentId") UUID departmentId, 
                          @RequestParam("lat") double lat, 
                          @RequestParam("lng") double lng);
}
