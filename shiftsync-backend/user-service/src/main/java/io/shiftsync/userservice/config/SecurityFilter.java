package io.shiftsync.userservice.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class SecurityFilter implements Filter {

    private final String internalSecret;

    public SecurityFilter(@Value("${app.internal-secret}") String internalSecret) {
        this.internalSecret = internalSecret;
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        String requestSecret = httpRequest.getHeader("X-Internal-Secret");
        
        // Exclude actuator endpoints from strict gateway checking if desired, or allow all for dev
        if (httpRequest.getRequestURI().startsWith("/actuator")) {
            chain.doFilter(request, response);
            return;
        }

        if (internalSecret == null || !internalSecret.equals(requestSecret)) {
            HttpServletResponse httpResponse = (HttpServletResponse) response;
            httpResponse.setStatus(HttpServletResponse.SC_FORBIDDEN);
            httpResponse.getWriter().write("{\"error\": \"FORBIDDEN\", \"message\": \"Direct access not allowed\"}");
            return;
        }
        
        chain.doFilter(request, response);
    }
}
