package com.baccuisine.baccuisine_backend.dto.response;

import com.baccuisine.baccuisine_backend.enums.MealType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyMenuDTO {
    private LocalDate date;
    private MealType mealType;
    private List<MealDTO> items;
}