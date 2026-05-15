package com.baccuisine.baccuisine_backend.dto.request;

import com.baccuisine.baccuisine_backend.enums.DietaryType;
import com.baccuisine.baccuisine_backend.enums.MealType;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MealRequest {

    @NotBlank(message = "Meal name is required")
    @Size(min = 1, max = 255, message = "Meal name must be between 1 and 255 characters")
    private String name;

    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    private String description;

    @NotNull(message = "Meal type is required")
    private MealType mealType;

    /**
     * The date this meal is intended for.
     * Defaults to today in the service layer if not provided.
     * Format: "yyyy-MM-dd" (e.g., "2026-05-15")
     */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate mealDate;

    /**
     * Order deadline time - null means no deadline.
     * Format: "HH:mm:ss" or "HH:mm" (e.g., "11:00:00" or "11:00")
     * Timezone: Africa/Harare (configured in application.properties)
     */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "HH:mm:ss", timezone = "Africa/Harare")
    private LocalTime orderDeadline;

    /**
     * Set of dietary types compatible with this meal.
     * Empty set or null = no restrictions (all diets allowed).
     * Example: ["NORMAL", "DIABETIC", "VEGETARIAN"]
     *
     * Jackson automatically deserializes string enum names to DietaryType.
     * Invalid values will return 400 Bad Request automatically.
     */
    private Set<DietaryType> compatibleDiets;

    /**
     * Optional: ID of the DailyMenu this meal belongs to.
     * Set this if the meal should be linked to a specific daily menu entry.
     */
    private Long dailyMenuId;
}