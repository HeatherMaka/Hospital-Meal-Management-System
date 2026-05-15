package com.baccuisine.baccuisine_backend.dto.response;

import com.baccuisine.baccuisine_backend.enums.MealType;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * DTO representing a meal item in the daily menu
 * Used in: DailyMenuDTO, OrderDTO, and other responses
 *
 * CRITICAL: dailyMenuId is the ID to use when placing orders
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MealDTO {

    /**
     * Meal entity ID (for display/reference only)
     *  Do NOT use this for placing orders
     */
    private Long id;

    /**
     *  DAILY MENU ENTITY ID - USE THIS FOR ORDERING
     * This is the ID to send in OrderRequest.dailyMenuId
     */
    private Long dailyMenuId;

    /**
     * Meal name (e.g., "Corn Flakes", "Grilled Chicken")
     */
    private String name;

    /**
     * Meal description (e.g., "With milk and sugar")
     */
    private String description;

    /**
     * Meal type: BREAKFAST, LUNCH, or SUPPER
     */
    private MealType mealType;

    /**
     * Date this meal is available
     */
    private LocalDate mealDate;

    /**
     *  Field name is 'active' (database value - isActive)
     * Whether this meal is active in the system regardless of deadline
     * Jackson serializes this as "active" in JSON
     */
    private Boolean active;

    /**
     * Computed value showing if meal can be ordered now
     * This is based on active status AND deadline check
     * Jackson serializes isOrderable() as "orderable" in JSON
     */
    private Boolean orderable;

    /**
     * Compatible dietary types (empty = all diets allowed)
     * Example: ["DIABETIC", "VEGETARIAN"]
     */
    private List<String> compatibleDiets;

    /**
     * Order deadline - null = no deadline
     * Jackson automatically serializes LocalTime to ISO-8601 string: "11:00:00"
     */
    private LocalTime orderDeadline;

    /**
     * Audit fields
     */
    private Long createdById;
    private String createdByRole;

    // ============ Helper Methods ============

    /**
     * Check if this meal is compatible with a patient's dietary type
     * @param patientDietaryType The patient's dietary restriction (e.g., "DIABETIC")
     * @return true if meal is compatible or has no restrictions
     */
    public boolean isCompatibleWith(String patientDietaryType) {
        if (compatibleDiets == null || compatibleDiets.isEmpty()) {
            return true; // No restrictions = compatible with all
        }
        if (patientDietaryType == null || patientDietaryType.isEmpty()) {
            return true; // Patient has no restrictions = compatible
        }
        return compatibleDiets.contains(patientDietaryType);
    }

    /**
     * Check if ordering is still open for this meal
     * @param currentTime Current server time
     * @return true if order can still be placed
     */
    public boolean isOrderingOpen(java.time.LocalDateTime currentTime) {
        if (orderDeadline == null) {
            return true; // No deadline = always open
        }
        // Convert LocalTime to LocalDateTime using mealDate for comparison
        java.time.LocalDateTime deadline = mealDate != null
                ? java.time.LocalDateTime.of(mealDate, orderDeadline)
                : java.time.LocalDateTime.of(LocalDate.now(), orderDeadline);
        return currentTime.isBefore(deadline);
    }
}