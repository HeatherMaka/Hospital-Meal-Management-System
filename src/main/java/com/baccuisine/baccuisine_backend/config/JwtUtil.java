// src/main/java/com/baccuisine/baccuisine_backend/config/JwtUtil.java
package com.baccuisine.baccuisine_backend.config;

import com.baccuisine.baccuisine_backend.enums.Role;
import com.baccuisine.baccuisine_backend.model.Patient;
import com.baccuisine.baccuisine_backend.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Component
@Slf4j
public class JwtUtil {

    // Load secret from application.properties with fallback
    @Value("${app.jwt.secret:DefaultSecretKeyForDevelopmentOnly_MustBeAtLeast32Chars!@#2024}")
    private String jwtSecret;

    @Value("${app.jwt.expiration:86400000}")
    private long jwtExpirationMs;

    private static final long PATIENT_TOKEN_VALIDITY = 7 * 24 * 60 * 60 * 1000; // 7 days

    private SecretKey signingKey;

    // Initialize signing key AFTER @Value injection completes
    @PostConstruct
    public void init() {
        // Validate and sanitize secret
        if (jwtSecret == null) {
            jwtSecret = "DefaultSecretKeyForDevelopmentOnly_MustBeAtLeast32Chars!@#2024";
            log.warn(" JWT secret was null, using fallback (INSECURE FOR PRODUCTION)");
        }

        jwtSecret = jwtSecret.trim();

        if (jwtSecret.length() < 32) {
            log.warn(" JWT secret is too short ({} chars < 32 min). Using secure fallback.", jwtSecret.length());
            jwtSecret = "DefaultSecretKeyForDevelopmentOnly_MustBeAtLeast32Chars!@#2024";
        }

        // Derive SecretKey using UTF-8 for cross-platform consistency
        this.signingKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));

        // Log initialization (never log the actual secret!)
        log.info(" JWT initialized - Secret: {} chars, Algorithm: HS256", jwtSecret.length());
    }

    // ============ REGULAR USER TOKENS ============

    public String generateToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();

        if (userDetails instanceof User user) {
            claims.put("userId", user.getId());
            claims.put("role", user.getRole());
            claims.put("fullName", user.getFullName());
            claims.put("department", user.getDepartment());
            claims.put("tokenType", "USER");
        }

        return createToken(claims, userDetails.getUsername(), jwtExpirationMs);
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    // Centralized claim extraction with comprehensive error handling
    private Claims extractAllClaims(String token) {
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(signingKey)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
        } catch (io.jsonwebtoken.security.SignatureException e) {
            log.error("JWT SIGNATURE MISMATCH! Verify app.jwt.secret is identical for signing & verification.");
            log.error("   Secret length: {} chars (minimum 32 required for HS256)",
                    jwtSecret != null ? jwtSecret.length() : 0);
            log.error("   Token preview: {}",
                    token != null && token.length() > 30 ? token.substring(0, 30) + "..." : "null");
            throw e;
        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            log.warn("JWT token expired at {}", e.getClaims().getExpiration());
            throw e;
        } catch (io.jsonwebtoken.MalformedJwtException e) {
            log.error(" Malformed JWT token: {}", e.getMessage());
            throw e;
        } catch (io.jsonwebtoken.UnsupportedJwtException e) {
            log.error(" Unsupported JWT token: {}", e.getMessage());
            throw e;
        } catch (IllegalArgumentException e) {
            log.error(" Invalid JWT token argument: {}", e.getMessage());
            throw e;
        }
    }

    private String createToken(Map<String, Object> claims, String subject, long expiration) {
        log.debug(" Creating JWT token for subject: {} (expires in {} ms)", subject, expiration);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public Boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            final String username = extractUsername(token);
            String tokenType = extractClaim(token, claims -> claims.get("tokenType", String.class));

            // Patient tokens should not validate as user tokens
            if ("PATIENT".equals(tokenType)) {
                log.debug(" Patient token cannot validate as user token");
                return false;
            }

            boolean valid = username.equals(userDetails.getUsername()) && !isTokenExpired(token);
            log.debug(" User token validation: {} for user {}", valid, username);
            return valid;
        } catch (Exception e) {
            log.warn(" User token validation failed: {}", e.getMessage());
            return false;
        }
    }

    private Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    // Helper for service layer to validate and extract user details from token
    public UserDetails validateUserToken(String token) {
        try {
            Claims claims = extractAllClaims(token);
            String tokenType = claims.get("tokenType", String.class);

            if ("PATIENT".equals(tokenType)) {
                return null; // Not a user token
            }

            String role = claims.get("role", String.class);
            String username = claims.getSubject();

            return org.springframework.security.core.userdetails.User
                    .withUsername(username)
                    .password("") // Password not needed for token auth
                    .authorities("ROLE_" + role)
                    .build();
        } catch (Exception e) {
            log.debug(" User token validation failed (may be patient token): {}", e.getMessage());
            return null;
        }
    }

    // ============ PATIENT TOKENS ============

    public String generatePatientToken(String wardNumber, String bedNumber, String nin, Long patientId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("patientId", patientId);
        claims.put("wardNumber", wardNumber);
        claims.put("bedNumber", bedNumber);
        claims.put("nin", nin);
        claims.put("tokenType", "PATIENT");
        // Use "PATIENT" to match SecurityConfig.hasRole("PATIENT") → ROLE_PATIENT
        claims.put("role", Role.PATIENT.name());

        // Unique subject for patient tokens
        String subject = wardNumber + ":" + bedNumber + ":" + nin;
        return createToken(claims, subject, PATIENT_TOKEN_VALIDITY);
    }

    public Patient extractPatientFromToken(String token) {
        try {
            Claims claims = extractAllClaims(token);
            String tokenType = claims.get("tokenType", String.class);

            // Only process patient tokens
            if (!"PATIENT".equals(tokenType)) {
                return null;
            }

            Patient patient = new Patient();
            patient.setId(claims.get("patientId", Long.class));
            patient.setWardNumber(claims.get("wardNumber", String.class));
            patient.setBedNumber(claims.get("bedNumber", String.class));
            patient.setNin(claims.get("nin", String.class));
            patient.setRole(claims.get("role", String.class));

            return patient;
        } catch (Exception e) {
            log.debug(" Patient token extraction failed: {}", e.getMessage());
            return null;
        }
    }

    public Boolean isPatientTokenValid(String token, Patient patient) {
        try {
            Claims claims = extractAllClaims(token);

            // Verify token type
            if (!"PATIENT".equals(claims.get("tokenType", String.class))) {
                return false;
            }

            // Verify patient details match token claims
            String tokenWard = claims.get("wardNumber", String.class);
            String tokenBed = claims.get("bedNumber", String.class);
            String tokenNin = claims.get("nin", String.class);

            boolean valid = patient.getWardNumber().equals(tokenWard) &&
                    patient.getBedNumber().equals(tokenBed) &&
                    patient.getNin().equals(tokenNin) &&
                    !isTokenExpired(token);

            log.debug(" Patient token validation: {} (ward={} bed={} nin={})",
                    valid, tokenWard, tokenBed, tokenNin);
            return valid;
        } catch (Exception e) {
            log.warn(" Patient token validation failed: {}", e.getMessage());
            return false;
        }
    }

    // ============ UTILITY METHODS ============

    public String extractRole(String token) {
        return extractClaim(token, claims -> claims.get("role", String.class));
    }

    public String extractTokenType(String token) {
        return extractClaim(token, claims -> claims.get("tokenType", String.class));
    }

    // Debug helper - call via endpoint or test to verify key consistency
    public String getKeyFingerprint() {
        if (signingKey == null) return "KEY_NOT_INITIALIZED";
        return Integer.toHexString(signingKey.getEncoded().hashCode());
    }
}