package io.shiftsync.attendance.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class QRService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final String serverSecret;

    public QRService(RedisTemplate<String, Object> redisTemplate, 
                     @Value("${app.internal-secret:dev-internal-secret-for-gateway}") String serverSecret) {
        this.redisTemplate = redisTemplate;
        this.serverSecret = serverSecret;
    }

    public QRGenerationResult generateQR(UUID shiftId) {
        Instant windowStart = Instant.now();
        String payload = shiftId.toString() + "|" + windowStart.toEpochMilli();
        
        String signature = generateHmacSha256(payload, serverSecret);
        String tokenPayload = payload + "|" + signature;
        
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenPayload.getBytes(StandardCharsets.UTF_8));
        
        // Store in Redis: SETEX qr:{token} 90 {shiftId}
        redisTemplate.opsForValue().set("qr:" + token, shiftId.toString(), 90, TimeUnit.SECONDS);
        
        Instant expiresAt = windowStart.plusSeconds(90);
        return new QRGenerationResult(token, expiresAt);
    }

    public boolean validateQR(String token, UUID expectedShiftId) {
        String shiftIdInRedis = (String) redisTemplate.opsForValue().get("qr:" + token);
        if (shiftIdInRedis == null || !shiftIdInRedis.equals(expectedShiftId.toString())) {
            return false;
        }

        try {
            String decoded = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8);
            String[] parts = decoded.split("\\|");
            if (parts.length != 3) {
                return false;
            }
            
            String payload = parts[0] + "|" + parts[1];
            String expectedSignature = generateHmacSha256(payload, serverSecret);
            
            return expectedSignature.equals(parts[2]);
        } catch (Exception e) {
            return false;
        }
    }

    private String generateHmacSha256(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] hmacBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hmacBytes);
        } catch (Exception e) {
            throw new RuntimeException("Failed to calculate HMAC-SHA256", e);
        }
    }

    public record QRGenerationResult(String token, Instant expiresAt) {}
}
