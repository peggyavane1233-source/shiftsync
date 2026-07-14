package io.shiftsync.auth.service;

import io.shiftsync.auth.domain.LoginAttempt;
import io.shiftsync.auth.domain.RefreshToken;
import io.shiftsync.auth.domain.User;
import io.shiftsync.auth.repository.LoginAttemptRepository;
import io.shiftsync.auth.repository.RefreshTokenRepository;
import io.shiftsync.auth.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final LoginAttemptRepository loginAttemptRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final long refreshExpirationMs;

    public AuthService(UserRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       LoginAttemptRepository loginAttemptRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       @Value("${app.security.jwt.refresh-expiration-ms:2592000000}") long refreshExpirationMs) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.loginAttemptRepository = loginAttemptRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshExpirationMs = refreshExpirationMs;
    }

    @Transactional
    public LoginResult login(String email, String password, String ipAddress) {
        Instant oneMinuteAgo = Instant.now().minusSeconds(60);
        long failedAttempts = loginAttemptRepository.countFailedAttemptsSince(ipAddress, oneMinuteAgo);
        
        if (failedAttempts >= 10) {
            throw new IllegalArgumentException("Account locked due to too many failed attempts. Try again in 15 minutes.");
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty() || !passwordEncoder.matches(password, userOpt.get().getPasswordHash())) {
            logAttempt(ipAddress, email, false);
            throw new IllegalArgumentException("Invalid credentials");
        }
        
        logAttempt(ipAddress, email, true);
        User user = userOpt.get();
        return generateTokens(user, UUID.randomUUID());
    }

    private void logAttempt(String ipAddress, String email, boolean success) {
        LoginAttempt attempt = new LoginAttempt();
        attempt.setId(UUID.randomUUID());
        attempt.setIpAddress(ipAddress);
        attempt.setEmail(email);
        attempt.setSuccess(success);
        loginAttemptRepository.save(attempt);
    }

    private LoginResult generateTokens(User user, UUID familyId) {
        String accessToken = jwtService.generateAccessToken(user);
        
        String rawRefreshToken = UUID.randomUUID().toString();
        String hashedToken = passwordEncoder.encode(rawRefreshToken);
        
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setId(UUID.randomUUID());
        refreshToken.setUserId(user.getId());
        refreshToken.setFamilyId(familyId);
        refreshToken.setTokenHash(hashedToken);
        refreshToken.setExpiresAt(Instant.now().plusMillis(refreshExpirationMs));
        
        refreshTokenRepository.save(refreshToken);
        
        return new LoginResult(accessToken, rawRefreshToken);
    }

    public record LoginResult(String accessToken, String refreshToken) {}
}
