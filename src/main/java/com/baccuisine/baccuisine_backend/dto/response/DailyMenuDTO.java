// src/main/java/com/baccuisine/baccuisine_backend/dto/response/DailyMenuDTO.java
package com.baccuisine.baccuisine_backend.dto.response;

import com.baccuisine.baccuisine_backend.enums.MealType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * Response DTO for daily menu data sent to patients
 * Used by: GET /api/patient/menu?date=YYYY-MM-DD
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyMenuDTO {

    /**
     * The date this menu is for
     */
    private LocalDate date;

    /**
     * Meal type: BREAKFAST, LUNCH, or SUPPER
     */
    private MealType mealType;

    /**
     * List of available meals for this date + mealType
     * Uses top-level MealDTO class (not nested)
     */
    private List<MealDTO> items;  //  Now references top-level MealDTO
}