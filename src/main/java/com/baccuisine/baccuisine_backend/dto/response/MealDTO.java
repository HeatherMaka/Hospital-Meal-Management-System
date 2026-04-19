package com.baccuisine.baccuisine_backend.dto.response;

import com.baccuisine.baccuisine_backend.enums.DietaryType;
import com.baccuisine.baccuisine_backend.enums.MealType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MealDTO {
    private Long id;
    private String name;
    private String description;
    private MealType mealType;
    private LocalDate mealDate;
    private LocalTime orderDeadline;
    private Set<DietaryType> compatibleDiets;
    private boolean isActive;
    private Long createdById;
    private String createdByRole;

    public boolean isOrderable() {
        return isActive && (orderDeadline == null || orderDeadline.isAfter(LocalTime.now()));
    }
}