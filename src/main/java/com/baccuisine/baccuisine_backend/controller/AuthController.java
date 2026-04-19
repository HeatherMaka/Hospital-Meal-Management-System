package com.baccuisine.baccuisine_backend.controller;

import com.baccuisine.baccuisine_backend.dto.request.LoginRequest;
import com.baccuisine.baccuisine_backend.dto.request.PatientLoginRequest;
import com.baccuisine.baccuisine_backend.dto.request.RegisterStaffRequest;
import com.baccuisine.baccuisine_backend.dto.response.AuthResponse;
import com.baccuisine.baccuisine_backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/patient/login")
    public ResponseEntity<AuthResponse> patientLogin(@Valid @RequestBody PatientLoginRequest request) {
        return ResponseEntity.ok(authService.patientLogin(request));
    }

    @PostMapping("/staff/register")
    public ResponseEntity<AuthResponse> registerStaff(@Valid @RequestBody RegisterStaffRequest request) {
        return ResponseEntity.ok(authService.registerStaff(request));
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<?> getCurrentUser() {
        // Implement user details endpoint
        return ResponseEntity.ok().build();
    }
}