package com.baccuisine.baccuisine_backend.controller;

import com.baccuisine.baccuisine_backend.dto.request.MealRequest;
import com.baccuisine.baccuisine_backend.dto.response.MealDTO;
import com.baccuisine.baccuisine_backend.enums.DietaryType;
import com.baccuisine.baccuisine_backend.enums.MealType;
import com.baccuisine.baccuisine_backend.service.MealService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/meals")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class MealController {

    private final MealService mealService;

    // ============ Public Endpoints ============

    /**
     * Get all active meals (Available to all authenticated users)
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'PATIENT')")
    public ResponseEntity<List<MealDTO>> getAllActiveMeals() {
        return ResponseEntity.ok(mealService.getAllActiveMeals());
    }

    /**
     * Get meal by ID (Available to all authenticated users)
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'PATIENT')")
    public ResponseEntity<MealDTO> getMealById(@PathVariable Long id) {
        return ResponseEntity.ok(mealService.getMealById(id));
    }

    /**
     * Get meals by type (Breakfast, Lunch, Supper)
     */
    @GetMapping("/type/{mealType}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'PATIENT')")
    public ResponseEntity<List<MealDTO>> getMealsByType(@PathVariable MealType mealType) {
        return ResponseEntity.ok(mealService.getMealsByType(mealType));
    }

    /**
     * Get meals compatible with specific dietary type (For patients)
     */
    @GetMapping("/dietary/{dietaryType}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'PATIENT')")
    public ResponseEntity<List<MealDTO>> getMealsByDietaryType(@PathVariable DietaryType dietaryType) {
        return ResponseEntity.ok(mealService.getMealsByDietaryType(dietaryType));
    }

    // ============ Admin/Staff Only Endpoints ============

    /**
     * Create new meal (Admin & Staff only)
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<MealDTO> createMeal(@Valid @RequestBody MealRequest request) {
        MealDTO createdMeal = mealService.createMeal(request);
        return ResponseEntity.status(201).body(createdMeal);
    }

    /**
     * Update existing meal (Admin & Staff only)
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<MealDTO> updateMeal(
            @PathVariable Long id,
            @Valid @RequestBody MealRequest request
    ) {
        return ResponseEntity.ok(mealService.updateMeal(id, request));
    }

    /**
     * Deactivate meal (soft delete) (Admin only)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deactivateMeal(@PathVariable Long id) {
        mealService.deactivateMeal(id);
        return ResponseEntity.ok().body(Map.of("message", "Meal deactivated successfully"));
    }

    /**
     * Reactivate meal (Admin only)
     */
    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MealDTO> reactivateMeal(@PathVariable Long id) {
        return ResponseEntity.ok(mealService.reactivateMeal(id));
    }

    // ============ Analytics Endpoints ============

    /**
     * Get meal statistics (Admin & Staff only)
     */
    @GetMapping("/statistics")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<?> getMealStatistics(
            @RequestParam(required = false) MealType mealType,
            @RequestParam(required = false) DietaryType dietaryType
    ) {
        // Implement in MealService
        return ResponseEntity.ok().build();
    }
}