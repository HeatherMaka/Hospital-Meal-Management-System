package com.baccuisine.baccuisine_backend.service;

import com.baccuisine.baccuisine_backend.config.JwtUtil;
import com.baccuisine.baccuisine_backend.dto.request.LoginRequest;
import com.baccuisine.baccuisine_backend.dto.request.PatientLoginRequest;
import com.baccuisine.baccuisine_backend.dto.request.RegisterStaffRequest;
import com.baccuisine.baccuisine_backend.dto.response.AuthResponse;
import com.baccuisine.baccuisine_backend.dto.response.StaffResponse;
import com.baccuisine.baccuisine_backend.enums.Role;
import com.baccuisine.baccuisine_backend.exception.DuplicateResourceException;
import com.baccuisine.baccuisine_backend.exception.ResourceNotFoundException;
import com.baccuisine.baccuisine_backend.model.Patient;
import com.baccuisine.baccuisine_backend.model.User;
import com.baccuisine.baccuisine_backend.repository.PatientRepository;
import com.baccuisine.baccuisine_backend.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    // ============ Authentication ============

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()
                    )
            );

            User user = userRepository.findByUsername(request.getUsername())
                    .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

            if (!user.isActive()) {
                throw new BadCredentialsException("Account is deactivated");
            }

            String token = jwtUtil.generateToken(user);

            return AuthResponse.builder()
                    .token(token)
                    .role(user.getRole())
                    .userId(user.getId())
                    .username(user.getUsername())
                    .forcePasswordChange(user.isForcePasswordChange())
                    .message("Login successful")
                    .build();

        } catch (BadCredentialsException e) {
            throw new BadCredentialsException("Invalid username or password");
        }
    }

    public AuthResponse patientLogin(PatientLoginRequest request) {
        Patient patient = patientRepository
                .findByWardNumberAndBedNumberAndNin(
                        request.getWardNumber(),
                        request.getBedNumber(),
                        request.getNin()
                )
                .filter(Patient::isActive)
                .orElseThrow(() -> new BadCredentialsException("Invalid patient credentials"));

        String token = jwtUtil.generatePatientToken(
                patient.getWardNumber(),
                patient.getBedNumber(),
                patient.getNin(),
                patient.getId()
        );

        return AuthResponse.builder()
                .token(token)
                .role(Role.PATIENT)
                .message("Patient login successful")
                .patientId(patient.getId())
                .wardNumber(patient.getWardNumber())
                .bedNumber(patient.getBedNumber())
                .name(patient.getName() + " " + patient.getSurname())
                .build();
    }

    // ============ Staff Management (Admin-Driven) ============

    @Transactional
    public StaffResponse adminRegisterStaff(RegisterStaffRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("Username '" + request.getUsername() + "' already exists");
        }

        if (request.getPhone() != null && !request.getPhone().isEmpty()
                && userRepository.existsByPhone(request.getPhone())) {
            throw new DuplicateResourceException("Phone number already registered");
        }

        Role staffRole = determineStaffRole(request.getRole());

        User staff = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .email(request.getEmail())
                .department(request.getDepartment())
                .role(staffRole)
                .active(true)
                .isApproved(true)
                .createdBy("ADMIN")
                .createdAt(LocalDateTime.now())
                .forcePasswordChange(true)
                .build();

        User savedStaff = userRepository.save(staff);
        return mapToStaffResponse(savedStaff);
    }

    @Transactional
    public AuthResponse registerStaff(@Valid RegisterStaffRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("Username '" + request.getUsername() + "' already exists");
        }

        if (request.getPhone() != null && !request.getPhone().isEmpty()
                && userRepository.existsByPhone(request.getPhone())) {
            throw new DuplicateResourceException("Phone number already registered");
        }

        Role staffRole = determineStaffRole(request.getRole());

        User staff = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .email(request.getEmail())
                .department(request.getDepartment())
                .role(staffRole)
                .active(true)
                .isApproved(true)
                .createdBy("ADMIN")
                .createdAt(LocalDateTime.now())
                .forcePasswordChange(true)
                .build();

        User savedStaff = userRepository.save(staff);
        String token = jwtUtil.generateToken(savedStaff);

        return AuthResponse.builder()
                .token(token)
                .role(savedStaff.getRole())
                .userId(savedStaff.getId())
                .username(savedStaff.getUsername())
                .forcePasswordChange(true)
                .message("Staff registered successfully. Please change password on first login.")
                .build();
    }

    @Transactional(readOnly = true)
    public List<StaffResponse> getAllActiveStaff() {
        return userRepository.findAll().stream()
                .filter(User::isActive)
                .filter(user -> user.getRole() != Role.ADMIN && user.getRole() != Role.PATIENT)
                .map(this::mapToStaffResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public StaffResponse getStaffById(Long id) {
        User staff = userRepository.findById(id)
                .filter(User::isActive)
                .filter(user -> user.getRole() != Role.ADMIN && user.getRole() != Role.PATIENT)
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found with id: " + id));

        return mapToStaffResponse(staff);
    }

    @Transactional
    public StaffResponse updateStaff(Long id, RegisterStaffRequest request) {
        User staff = getStaffByIdEntity(id); // Get entity for update

        if (request.getFullName() != null) {
            staff.setFullName(request.getFullName());
        }
        if (request.getPhone() != null && !request.getPhone().isEmpty()) {
            if (!request.getPhone().equals(staff.getPhone())
                    && userRepository.existsByPhone(request.getPhone())) {
                throw new DuplicateResourceException("Phone number already registered");
            }
            staff.setPhone(request.getPhone());
        }
        if (request.getEmail() != null) {
            staff.setEmail(request.getEmail());
        }
        if (request.getDepartment() != null) {
            staff.setDepartment(request.getDepartment());
        }
        if (request.getRole() != null) {
            Role newRole = determineStaffRole(request.getRole());
            staff.setRole(newRole);
        }

        staff.setUpdatedAt(LocalDateTime.now());
        User updated = userRepository.save(staff);
        return mapToStaffResponse(updated);
    }

    @Transactional
    public void resetStaffPassword(Long id, String newPassword) {
        User staff = getStaffByIdEntity(id);

        if (newPassword == null || newPassword.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters");
        }

        staff.setPassword(passwordEncoder.encode(newPassword));
        staff.setForcePasswordChange(true);
        staff.setUpdatedAt(LocalDateTime.now());
        userRepository.save(staff);
    }

    @Transactional
    public StaffResponse deactivateStaff(Long id) {
        User staff = getStaffByIdEntity(id);
        staff.setActive(false);
        staff.setUpdatedAt(LocalDateTime.now());
        User updated = userRepository.save(staff);
        return mapToStaffResponse(updated);
    }

    @Transactional
    public StaffResponse reactivateStaff(Long id) {
        User staff = userRepository.findById(id)
                .filter(user -> user.getRole() != Role.ADMIN && user.getRole() != Role.PATIENT)
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found with id: " + id));

        staff.setActive(true);
        staff.setUpdatedAt(LocalDateTime.now());
        User updated = userRepository.save(staff);
        return mapToStaffResponse(updated);
    }

    // ============ Helper Methods ============

    /**
     * Internal helper: get staff entity by ID (for internal updates)
     */
    private User getStaffByIdEntity(Long id) {
        return userRepository.findById(id)
                .filter(User::isActive)
                .filter(user -> user.getRole() != Role.ADMIN && user.getRole() != Role.PATIENT)
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found with id: " + id));
    }

    /**
     * Map User Entity -> StaffResponse DTO
     */
    private StaffResponse mapToStaffResponse(User user) {
        DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
        return StaffResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .department(user.getDepartment())
                .role(user.getRole())
                .active(user.isActive())
                .forcePasswordChange(user.isForcePasswordChange())
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().format(formatter) : null)
                .updatedAt(user.getUpdatedAt() != null ? user.getUpdatedAt().format(formatter) : null)
                .build();
    }

    private Role determineStaffRole(String requestedRole) {
        if (requestedRole == null || requestedRole.isEmpty()) {
            return Role.STAFF;
        }
        try {
            Role role = Role.valueOf(requestedRole.toUpperCase());
            if (role == Role.ADMIN || role == Role.PATIENT) {
                return Role.STAFF;
            }
            return role;
        } catch (IllegalArgumentException e) {
            return Role.STAFF;
        }
    }

    @Transactional(readOnly = true)
    public User getCurrentUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }
}