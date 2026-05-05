package com.baccuisine.baccuisine_backend.dto.request;

import com.baccuisine.baccuisine_backend.enums.DietaryType;
import com.baccuisine.baccuisine_backend.enums.MealType;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;
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
     */
    @JsonFormat(shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate mealDate;

    /**
     * List of dietary types that can consume this meal.
     * Example: [NORMAL, DIABETIC]
     */
    private Set<DietaryType> compatibleDiets;
}