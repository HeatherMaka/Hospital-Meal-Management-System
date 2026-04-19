// src/main/java/com/baccuisine/baccuisine_backend/dto/request/OrderRequest.java
package com.baccuisine.baccuisine_backend.dto.request;

import com.baccuisine.baccuisine_backend.enums.MealType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 *  Request DTO for placing a new meal order
 * Used by: POST /api/patient/orders
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderRequest {

    // ============ REQUIRED FIELDS ============

    /**
     * ID of the DailyMenu entry being ordered
     * This links to a specific meal + date + mealType combination
     */
    @NotNull(message = "Daily menu item ID is required")
    private Long dailyMenuId;

    // ============ OPTIONAL FIELDS ============

    /**
     *  Quantity of this meal to order
     * Default: 1 | Range: 1-10 (prevent abuse)
     */
    @Builder.Default
    @Min(value = 1, message = "Quantity must be at least 1")
    @Max(value = 10, message = "Quantity cannot exceed 10 per order")
    private Integer quantity = 1;

    /**
     * Special dietary requests, allergies, or preferences
     * Max length: 500 characters to prevent abuse
     * Example: "No onions please", "Diabetic - no sugar", "Extra napkins"
     */
    @Size(max = 500, message = "Special request cannot exceed 500 characters")
    private String specialRequest;

    // ============ VALIDATION HELPER FIELDS (Optional - for extra safety) ============
    // These can be used to double-check the order matches the dailyMenu entry

    /**
     * The date this order is for (should match dailyMenu.date)
     * Optional: Backend will derive from DailyMenu if not provided
     */
    private LocalDate orderDate;

    /**
     * The meal type (BREAKFAST/LUNCH/SUPPER) for this order
     * Optional: Backend will derive from DailyMenu if not provided
     * Useful for frontend validation before submit
     */
    private MealType mealType;

    /**
     * Direct meal ID reference (alternative to dailyMenuId)
     * Optional: Use if your frontend tracks meals separately from daily menus
     */
    private Long mealId;

    // ============ HELPER METHODS ============

    /**
     *  Check if special request is meaningful (not just whitespace)
     */
    public boolean hasSpecialRequest() {
        return specialRequest != null && !specialRequest.trim().isEmpty();
    }

    /**
     *  Get sanitized special request (trimmed, null if empty)
     */
    public String getSanitizedSpecialRequest() {
        if (!hasSpecialRequest()) return null;
        return specialRequest.trim();
    }

    /**
     * Validate that required context fields match (if provided)
     * Call this in service layer for extra safety
     */
    public boolean contextMatches(Long actualDailyMenuId, LocalDate actualDate, MealType actualMealType) {
        boolean idMatch = dailyMenuId.equals(actualDailyMenuId);
        boolean dateMatch = orderDate == null || orderDate.equals(actualDate);
        boolean typeMatch = mealType == null || mealType.equals(actualMealType);
        return idMatch && dateMatch && typeMatch;
    }
}