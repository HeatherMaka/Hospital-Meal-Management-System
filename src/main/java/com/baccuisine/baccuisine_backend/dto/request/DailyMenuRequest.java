package com.baccuisine.baccuisine_backend.dto.request;

import com.baccuisine.baccuisine_backend.enums.DietaryType;
import com.baccuisine.baccuisine_backend.enums.MealType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyMenuRequest {

    @NotNull(message = "Menu date is required")
    private LocalDate menuDate;

    @NotNull(message = "Meal type is required")
    private MealType mealType;

    @Valid
    private List<MealItemRequest> meals;

    private Long createdById;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MealItemRequest {
        @NotNull(message = "Meal name is required")
        private String name;

        private String description;

        private Set<DietaryType> compatibleDiets;

        private LocalTime orderDeadline;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MealUpdateRequest {
        private String name;
        private String description;
        private Set<DietaryType> compatibleDiets;
        private LocalTime orderDeadline;
    }
}