package com.baccuisine.baccuisine_backend.controller;

import com.baccuisine.baccuisine_backend.dto.request.OrderRequest;
import com.baccuisine.baccuisine_backend.dto.response.DailyMenuDTO;
import com.baccuisine.baccuisine_backend.dto.response.OrderDTO;
import com.baccuisine.baccuisine_backend.enums.DietaryType;
import com.baccuisine.baccuisine_backend.model.Patient;
import com.baccuisine.baccuisine_backend.service.DailyMenuService;
import com.baccuisine.baccuisine_backend.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/patient")
@RequiredArgsConstructor
@PreAuthorize("hasRole('PATIENT')")
@CrossOrigin(origins = "http://localhost:5173")
public class PatientController {

    private final DailyMenuService dailyMenuService;
    private final OrderService orderService;

    /**
     * Get menu for patient (with dietary filtering)
     */
    @GetMapping("/menu")
    public ResponseEntity<List<DailyMenuDTO>> getMenu(
            @AuthenticationPrincipal Patient patient,
            @RequestParam LocalDate date
    ) {
        return ResponseEntity.ok(
                dailyMenuService.getDailyMenuForPatient(date, patient.getDietaryType())
        );
    }

    /**
     * Get weekly menu (7 days)
     */
    @GetMapping("/menu/weekly")
    public ResponseEntity<List<DailyMenuDTO>> getWeeklyMenu(
            @AuthenticationPrincipal Patient patient
    ) {
        LocalDate start = LocalDate.now();
        LocalDate end = start.plusDays(6);
        return ResponseEntity.ok(
                dailyMenuService.getMenuForDateRange(start, end)
        );
    }

    /**
     * Place order
     */
    @PostMapping("/orders")
    public ResponseEntity<OrderDTO> placeOrder(
            @AuthenticationPrincipal Patient patient,
            @Valid @RequestBody OrderRequest request
    ) {
        return ResponseEntity.ok(orderService.placeOrder(patient, request));
    }

    /**
     * Get patient's order history
     */
    @GetMapping("/orders")
    public ResponseEntity<List<OrderDTO>> getMyOrders(
            @AuthenticationPrincipal Patient patient,
            @RequestParam(required = false) LocalDate date
    ) {
        if (date == null) {
            date = LocalDate.now();
        }
        return ResponseEntity.ok(orderService.getPatientOrders(patient.getId(), date));
    }

    /**
     * Get patient profile
     */
    @GetMapping("/profile")
    public ResponseEntity<Patient> getProfile(@AuthenticationPrincipal Patient patient) {
        return ResponseEntity.ok(patient);
    }
}