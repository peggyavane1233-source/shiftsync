package io.shiftsync.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.security.PublicKey;

@Component
public class JwtAuthFilter extends AbstractGatewayFilterFactory<JwtAuthFilter.Config> {

    @Value("${app.internal-secret}")
    private String internalSecret;

    // For simplicity in dev, skipping strict signature check here.
    // In prod, use jjwt parser with a PublicKey fetched from JWKS or configured.

    public JwtAuthFilter() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            String path = exchange.getRequest().getURI().getPath();
            
            // Bypass for auth and actuator
            if (path.startsWith("/v1/auth") || path.startsWith("/actuator")) {
                return chain.filter(exchange);
            }

            String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return onError(exchange, "No authorization header", HttpStatus.UNAUTHORIZED);
            }

            String token = authHeader.substring(7);
            
            try {
                // Warning: In prod this must use .verifyWith(publicKey).build().parseSignedClaims()
                // using an unverified JWT for dev structural placeholder.
                int splitIndex = token.lastIndexOf('.');
                String withoutSignature = token.substring(0, splitIndex + 1);
                Claims claims = Jwts.parser().build().parseUnsecuredClaims(withoutSignature).getPayload();
                
                String userId = claims.getSubject();
                String role = claims.get("role", String.class);
                String deptId = claims.get("deptId", String.class);
                
                ServerWebExchange mutatedExchange = exchange.mutate()
                    .request(r -> r
                        .header("X-User-Id", userId)
                        .header("X-User-Role", role)
                        .header("X-Dept-Id", deptId != null ? deptId : "")
                        .header("X-Internal-Secret", internalSecret)
                    ).build();
                    
                return chain.filter(mutatedExchange);
                
            } catch (Exception e) {
                return onError(exchange, "Invalid Token", HttpStatus.UNAUTHORIZED);
            }
        };
    }

    private Mono<Void> onError(ServerWebExchange exchange, String err, HttpStatus httpStatus) {
        exchange.getResponse().setStatusCode(httpStatus);
        return exchange.getResponse().setComplete();
    }

    public static class Config {
        // empty config
    }
}
