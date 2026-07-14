package io.shiftsync.shift.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.UUID;

@FeignClient(name = "user-service", url = "${app.clients.user-service.url:http://localhost:8082}")
public interface UserServiceClient {

    @GetMapping("/v1/users/{userId}/certifications/{certId}/check")
    CertificationCheckResponse checkCertification(
            @PathVariable("userId") UUID userId, 
            @PathVariable("certId") UUID certId,
            @RequestHeader("X-Internal-Secret") String internalSecret
    );

    record CertificationCheckResponse(boolean isValid, String status) {}
}
