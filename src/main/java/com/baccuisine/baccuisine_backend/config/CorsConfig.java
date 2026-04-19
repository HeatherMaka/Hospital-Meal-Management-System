package com.baccuisine.baccuisine_backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Allow React Frontend URLs
        configuration.setAllowedOrigins(List.of(
                "http://localhost:5173",
                "http://localhost:3000",
                "http://localhost:8080"
        ));

        // Allowed HTTP Methods
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));

        // Allowed Headers
        configuration.setAllowedHeaders(List.of("*"));

        // Allow Credentials (Cookies, Auth Headers)
        configuration.setAllowCredentials(true);

        // Expose Authorization Header to frontend
        configuration.setExposedHeaders(List.of("Authorization"));

        // Max Age for preflight caching
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}