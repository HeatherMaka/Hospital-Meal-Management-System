package com.baccuisine.baccuisine_backend.dto.request;

import com.baccuisine.baccuisine_backend.enums.DietaryType;
import com.baccuisine.baccuisine_backend.enums.MealType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MealRequest {

    @NotBlank(message = "Meal name is required")
    private String name;

    private String description;

    @NotNull(message = "Meal type is required")
    private MealType mealType;

    /**
     * List of dietary types that can consume this meal.
     * Example: [NORMAL, DIABETIC]
     */
    private Set<DietaryType> compatibleDiets;
}