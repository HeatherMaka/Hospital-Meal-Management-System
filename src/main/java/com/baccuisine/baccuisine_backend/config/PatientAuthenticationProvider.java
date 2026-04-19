package com.baccuisine.baccuisine_backend.config;

import com.baccuisine.baccuisine_backend.enums.Role;
import com.baccuisine.baccuisine_backend.model.Patient;
import com.baccuisine.baccuisine_backend.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import java.util.Collections;

@Component
@RequiredArgsConstructor
public class PatientAuthenticationProvider implements AuthenticationProvider {

    private final PatientRepository patientRepository;

    @Override
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {
        String wardNumber = authentication.getName(); // wardNumber
        String credentials = (String) authentication.getCredentials(); // "bedNumber:nin"

        String[] parts = credentials.split(":");
        if (parts.length != 2) {
            throw new BadCredentialsException("Invalid patient credentials format");
        }

        String bedNumber = parts[0];
        String nin = parts[1];

        Patient patient = patientRepository
                .findByWardNumberAndBedNumberAndNin(wardNumber, bedNumber, nin)
                .filter(Patient::isActive)
                .orElseThrow(() -> new BadCredentialsException("Invalid patient credentials"));

        // Create patient details with PATIENT role
        var authorities = Collections.singletonList(new SimpleGrantedAuthority("ROLE_PATIENT"));

        return new UsernamePasswordAuthenticationToken(
                patient, // Principal is the Patient object
                null, // No password for patients
                authorities
        );
    }

    @Override
    public boolean supports(Class<?> authentication) {
        return authentication.equals(UsernamePasswordAuthenticationToken.class);
    }
}