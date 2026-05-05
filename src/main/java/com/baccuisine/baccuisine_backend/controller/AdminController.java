// src/main/java/com/baccuisine/baccuisine_backend/controller/AdminController.java
package com.baccuisine.baccuisine_backend.controller;

import com.baccuisine.baccuisine_backend.dto.request.PatientRegisterRequest;
import com.baccuisine.baccuisine_backend.dto.request.RegisterStaffRequest;
import com.baccuisine.baccuisine_backend.dto.response.AnalyticsDTO;
import com.baccuisine.baccuisine_backend.dto.response.AuthResponse;
import com.baccuisine.baccuisine_backend.dto.response.StaffResponse;
import com.baccuisine.baccuisine_backend.model.Patient;
import com.baccuisine.baccuisine_backend.service.AnalyticsService;
import com.baccuisine.baccuisine_backend.service.AuthService;
import com.baccuisine.baccuisine_backend.service.PatientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@CrossOrigin(origins = "http://localhost:5173")
public class AdminController {

    private final PatientService patientService;
    private final AuthService authService;
    private final AnalyticsService analyticsService;

    // ============ Patient Management ============

    @PostMapping("/patients")
    public ResponseEntity<Patient> registerPatient(@Valid @RequestBody PatientRegisterRequest request) {
        return ResponseEntity.ok(patientService.registerPatient(request));
    }

    @GetMapping("/patients")
    public ResponseEntity<List<Patient>> getAllPatients() {
        return ResponseEntity.ok(patientService.getAllActivePatients());
    }

    @GetMapping("/patients/{id}")
    public ResponseEntity<Patient> getPatient(@PathVariable Long id) {
        return ResponseEntity.ok(patientService.getPatientById(id));
    }

    @PutMapping("/patients/{id}")
    public ResponseEntity<Patient> updatePatient(
            @PathVariable Long id,
            @Valid @RequestBody PatientRegisterRequest request
    ) {
        return ResponseEntity.ok(patientService.updatePatient(id, request));
    }

    @PostMapping("/patients/{id}/discharge")
    public ResponseEntity<Patient> dischargePatient(@PathVariable Long id) {
        return ResponseEntity.ok(patientService.dischargePatient(id));
    }

    @DeleteMapping("/patients/{id}")
    public ResponseEntity<?> deletePatient(@PathVariable Long id) {
        patientService.deletePatient(id);
        return ResponseEntity.ok().body(java.util.Map.of("message", "Patient permanently deleted"));
    }

    // ============ Staff Management ============

    @PostMapping("/staff/register")
    public ResponseEntity<StaffResponse> registerStaff(@Valid @RequestBody RegisterStaffRequest request) {
        StaffResponse createdStaff = authService.adminRegisterStaff(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdStaff);
    }

    @GetMapping("/staff")
    public ResponseEntity<List<StaffResponse>> getAllStaff() {
        List<StaffResponse> staffList = authService.getAllActiveStaff();
        return ResponseEntity.ok(staffList);
    }

    @GetMapping("/staff/{id}")
    public ResponseEntity<StaffResponse> getStaff(@PathVariable Long id) {
        return ResponseEntity.ok(authService.getStaffById(id));
    }

    @PutMapping("/staff/{id}")
    public ResponseEntity<StaffResponse> updateStaff(
            @PathVariable Long id,
            @Valid @RequestBody RegisterStaffRequest request
    ) {
        return ResponseEntity.ok(authService.updateStaff(id, request));
    }

    @PatchMapping("/staff/{id}/reset-password")
    public ResponseEntity<?> resetStaffPassword(
            @PathVariable Long id,
            @RequestParam String newPassword
    ) {
        authService.resetStaffPassword(id, newPassword);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/staff/{id}/deactivate")
    public ResponseEntity<StaffResponse> deactivateStaff(@PathVariable Long id) {
        return ResponseEntity.ok(authService.deactivateStaff(id));
    }

    @PostMapping("/staff/{id}/reactivate")
    public ResponseEntity<StaffResponse> reactivateStaff(@PathVariable Long id) {
        return ResponseEntity.ok(authService.reactivateStaff(id));
    }

    // ============ Analytics ============

    /**
     * Return single AnalyticsDTO, not List<AnalyticsDTO>
     */
    @GetMapping("/analytics")
    public ResponseEntity<AnalyticsDTO> getAdminAnalytics(  // Changed return type
                                                            @RequestParam(required = false) LocalDate date
    ) {
        if (date == null) {
            date = LocalDate.now();
        }
        // Service returns single AnalyticsDTO - match controller signature
        AnalyticsDTO analytics = analyticsService.getAdminDashboardAnalytics(date);
        return ResponseEntity.ok(analytics);
    }

    /**
     * Get meal popularity stats (returns List<AnalyticsDTO.MealStats>)
     */
    @GetMapping("/analytics/meals")
    public ResponseEntity<List<AnalyticsDTO.MealStats>> getMealAnalytics(  // Explicit return type
                                                                           @RequestParam(required = false) LocalDate startDate,
                                                                           @RequestParam(required = false) LocalDate endDate
    ) {
        if (startDate == null) startDate = LocalDate.now().minusWeeks(1);
        if (endDate == null) endDate = LocalDate.now();
        List<AnalyticsDTO.MealStats> stats = analyticsService.getTopMeals(startDate, endDate);
        return ResponseEntity.ok(stats);
    }

    /**
     * Get analytics for multiple dates (if you need a list)
     */
    @GetMapping("/analytics/daily")
    public ResponseEntity<List<AnalyticsDTO>> getDailyAnalytics(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate
    ) {
        List<AnalyticsDTO> analyticsList = analyticsService.getAnalyticsForDateRange(startDate, endDate);
        return ResponseEntity.ok(analyticsList);
    }
}