package io.shiftsync.auth.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

@Component
public class JwtKeyProvider {

    private final RSAPrivateKey privateKey;
    private final RSAPublicKey publicKey;

    public JwtKeyProvider(
            @Value("${app.security.jwt.private-key-path:classpath:keys/private.pem}") Resource privateKeyResource,
            @Value("${app.security.jwt.public-key-path:classpath:keys/public.pem}") Resource publicKeyResource
    ) throws NoSuchAlgorithmException {
        RSAPrivateKey loadedPrivate = null;
        RSAPublicKey loadedPublic = null;
        try {
            if (privateKeyResource.exists() && publicKeyResource.exists()) {
                loadedPrivate = loadPrivateKey(readPem(privateKeyResource));
                loadedPublic = loadPublicKey(readPem(publicKeyResource));
            }
        } catch (Exception ignored) {
            // Fall back to ephemeral dev keys when PEM files are missing or invalid.
        }

        if (loadedPrivate == null || loadedPublic == null) {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            KeyPair pair = generator.generateKeyPair();
            loadedPrivate = (RSAPrivateKey) pair.getPrivate();
            loadedPublic = (RSAPublicKey) pair.getPublic();
        }

        this.privateKey = loadedPrivate;
        this.publicKey = loadedPublic;
    }

    public RSAPrivateKey getPrivateKey() {
        return privateKey;
    }

    public RSAPublicKey getPublicKey() {
        return publicKey;
    }

    private static String readPem(Resource resource) throws IOException {
        return new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
    }

    private static RSAPrivateKey loadPrivateKey(String pem) throws Exception {
        String normalized = pem
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s", "");
        byte[] decoded = Base64.getDecoder().decode(normalized);
        KeyFactory factory = KeyFactory.getInstance("RSA");
        return (RSAPrivateKey) factory.generatePrivate(new PKCS8EncodedKeySpec(decoded));
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
