package com.baccuisine.baccuisine_backend.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for placing a new meal order
 * Used by: POST /api/patient/orders
 */
@Data
@NoArgsConstructor
public class OrderRequest {

    /**
     * ID of the Meal being ordered (from the meals table)
     */
    @NotNull(message = "Meal ID is required")
    private Long mealId;

    /**
     * Quantity of this meal to order
     * Default: 1 | Range: 1-10
     */
    @Min(value = 1, message = "Quantity must be at least 1")
    @Max(value = 10, message = "Quantity cannot exceed 10 per order")
    private Integer quantity = 1;

    /**
     * Special dietary requests, allergies, or preferences
     * Max length: 500 characters
     */
    @Size(max = 500, message = "Special request cannot exceed 500 characters")
    private String specialRequest;

    // ============ HELPER METHODS ============

    public boolean hasSpecialRequest() {
        return specialRequest != null && !specialRequest.trim().isEmpty();
    }

    public String getSanitizedSpecialRequest() {
        if (!hasSpecialRequest()) return null;
        return specialRequest.trim();
    }
}