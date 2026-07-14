package io.shiftsync.shift.config;

import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableFeignClients(basePackages = "io.shiftsync.shift.client")
public class FeignConfig {
}
