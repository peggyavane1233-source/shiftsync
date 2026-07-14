package io.shiftsync.auth.service;

import io.jsonwebtoken.Jwts;
import io.shiftsync.auth.config.JwtKeyProvider;
import io.shiftsync.auth.domain.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Date;

@Service
public class JwtService {

    private final JwtKeyProvider keyProvider;
    private final long accessExpirationMs;

    public JwtService(JwtKeyProvider keyProvider, 
                      @Value("${app.security.jwt.access-expiration-ms:900000}") long accessExpirationMs) {
        this.keyProvider = keyProvider;
        this.accessExpirationMs = accessExpirationMs;
    }

    public String generateAccessToken(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + accessExpirationMs);

        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("role", user.getRole())
                .claim("deptId", user.getDepartmentId() != null ? user.getDepartmentId().toString() : null)
                .claim("employeeNo", user.getEmployeeNo())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(keyProvider.getPrivateKey())
                .compact();
    }
}
