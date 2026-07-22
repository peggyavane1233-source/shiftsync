package io.shiftsync.auth.controller;

import io.shiftsync.auth.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final io.shiftsync.auth.config.JwtKeyProvider keyProvider;

    public AuthController(AuthService authService, io.shiftsync.auth.config.JwtKeyProvider keyProvider) {
        this.authService = authService;
        this.keyProvider = keyProvider;
    }

    @GetMapping("/.well-known/jwks")
    public ResponseEntity<?> getJwks() {
        java.security.interfaces.RSAPublicKey publicKey = keyProvider.getPublicKey();
        String encoded = java.util.Base64.getEncoder().encodeToString(publicKey.getEncoded());
        return ResponseEntity.ok(Map.of(
            "keys", java.util.List.of(
                Map.of(
                    "kty", "RSA",
                    "use", "sig",
                    "kid", "1",
                    "n", encoded
                )
            )
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        String ipAddress = httpRequest.getRemoteAddr();
        AuthService.LoginResult result = authService.login(request.email(), request.password(), ipAddress);
        return ResponseEntity.ok(Map.of(
            "accessToken", result.accessToken(),
            "refreshToken", result.refreshToken()
        ));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody RefreshRequest request) {
        AuthService.LoginResult result = authService.refresh(request.refreshToken());
        return ResponseEntity.ok(Map.of(
            "accessToken", result.accessToken(),
            "refreshToken", result.refreshToken()
        ));
    }

    public record LoginRequest(String email, String password) {}
    public record RefreshRequest(String refreshToken) {}
}
