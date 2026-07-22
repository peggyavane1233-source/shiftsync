package io.shiftsync.gateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

@Component
public class JwtPublicKeyProvider {

    private final RSAPublicKey publicKey;

    public JwtPublicKeyProvider(
            @Value("${app.security.jwt.public-key-path:classpath:keys/public.pem}") Resource publicKeyResource
    ) throws NoSuchAlgorithmException {
        RSAPublicKey loaded = null;
        try {
            if (publicKeyResource.exists()) {
                loaded = loadPublicKey(readPem(publicKeyResource));
            }
        } catch (Exception ignored) {
            // Dev fallback: gateway uses unsecured JWT parsing when no public key is present.
        }
        this.publicKey = loaded;
    }

    public RSAPublicKey getPublicKey() {
        return publicKey;
    }

    public boolean hasPublicKey() {
        return publicKey != null;
    }

    private static String readPem(Resource resource) throws IOException {
        return new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
    }

    private static RSAPublicKey loadPublicKey(String pem) throws Exception {
        String normalized = pem
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replaceAll("\\s", "");
        byte[] decoded = Base64.getDecoder().decode(normalized);
        KeyFactory factory = KeyFactory.getInstance("RSA");
        return (RSAPublicKey) factory.generatePublic(new X509EncodedKeySpec(decoded));
    }
}
