package com.baccuisine.baccuisine_backend.util;

import com.baccuisine.baccuisine_backend.enums.MealType;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Component
public class TimeValidator {

    // Serving times configuration
    private static final LocalTime BREAKFAST_TIME = LocalTime.of(8, 0);
    private static final LocalTime LUNCH_TIME = LocalTime.of(13, 0);
    private static final LocalTime SUPPER_TIME = LocalTime.of(19, 0);
    private static final int CUTOFF_HOURS = 1; // 1 hour before serving

    /**
     * Check if ordering is still open for a specific meal
     */
    public boolean isOrderable(LocalDate date, MealType mealType) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime servingTime = getServingTime(date, mealType);
        LocalDateTime cutoffTime = servingTime.minusHours(CUTOFF_HOURS);

        // Cannot order past meals
        if (now.isAfter(servingTime)) {
            return false;
        }

        // Cannot order within cutoff period
        if (now.isAfter(cutoffTime)) {
            return false;
        }

        return true;
    }

    /**
     * Get serving time for a meal type
     */
    public LocalDateTime getServingTime(LocalDate date, MealType mealType) {
        LocalTime time = switch (mealType) {
            case BREAKFAST -> BREAKFAST_TIME;
            case LUNCH -> LUNCH_TIME;
            case SUPPER -> SUPPER_TIME;
        };
        return LocalDateTime.of(date, time);
    }

    /**
     * Get remaining time until cutoff
     */
    public long getMinutesUntilCutoff(LocalDate date, MealType mealType) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime cutoffTime = getServingTime(date, mealType).minusHours(CUTOFF_HOURS);

        if (now.isAfter(cutoffTime)) {
            return 0;
        }

        return java.time.Duration.between(now, cutoffTime).toMinutes();
    }
}