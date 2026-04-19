package com.baccuisine.baccuisine_backend.config;

import com.baccuisine.baccuisine_backend.model.Patient;
import com.baccuisine.baccuisine_backend.repository.PatientRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final PatientRepository patientRepository;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        final String requestURI = request.getRequestURI();
        final String method = request.getMethod();

        //  Log incoming request
        log.debug("JWT Filter: {} {}", method, requestURI);

        //  Skip JWT validation for public/auth endpoints (FIXED: correct paths)
        if (requestURI.startsWith("/api/auth/login") ||
                requestURI.startsWith("/api/auth/register") ||
                requestURI.equals("/api/auth/patient/login") ||
                requestURI.equals("/api/auth/patient/register") ||
                requestURI.startsWith("/swagger-ui") ||
                requestURI.startsWith("/v3/api-docs")) {

            log.debug(" Skipping JWT filter for public endpoint: {}", requestURI);
            filterChain.doFilter(request, response);
            return;
        }

        final String authHeader = request.getHeader("Authorization");

        //  Check for Bearer token
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.debug(" No valid Authorization header found for: {}", requestURI);
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);
        log.debug(" Token received (preview): {}", jwt.substring(0, Math.min(30, jwt.length())) + "...");

        try {
            // 🔹 Strategy 1: Try regular user authentication first
            String username = jwtUtil.extractUsername(jwt);

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                log.debug(" Attempting regular user auth for username: {}", username);

                UserDetails userDetails = jwtUtil.validateUserToken(jwt);

                if (userDetails != null && jwtUtil.isTokenValid(jwt, userDetails)) {
                    log.debug("Regular user authenticated: {}", username);
                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails, null, userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    filterChain.doFilter(request, response);
                    return; //  Exit early - auth successful
                }
            }

            // 🔹 Strategy 2: Try patient authentication (FIXED: independent check, not else)
            log.debug("Attempting patient token extraction...");
            Patient patient = jwtUtil.extractPatientFromToken(jwt);

            if (patient != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                log.debug(" Patient found in token: ward={}, nin={}",
                        patient.getWardNumber(), patient.getNin());

                if (jwtUtil.isPatientTokenValid(jwt, patient)) {
                    log.debug(" Patient token validated");

                    //  Ensure patient has proper authorities with ROLE_ prefix
                    var authorities = patient.getAuthorities();
                    log.debug(" Patient authorities: {}", authorities);

                    UsernamePasswordAuthenticationToken authToken =
                            new UsernamePasswordAuthenticationToken(
                                    patient, null, authorities);
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    log.debug(" Patient authentication set in SecurityContext");
                } else {
                    log.warn(" Patient token validation failed for ward={}", patient.getWardNumber());
                }
            } else if (patient == null) {
                log.debug(" No patient data extracted from token (may be regular user token)");
            }

        } catch (Exception e) {
            //  Proper exception logging
            log.error("JWT processing failed for URI {}: {}", requestURI, e.getMessage(), e);
            // Don't break the chain - let downstream @PreAuthorize handle authorization failure
        }

        filterChain.doFilter(request, response);
    }
}