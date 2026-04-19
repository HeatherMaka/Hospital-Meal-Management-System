// src/main/java/com/baccuisine/baccuisine_backend/dto/response/AnalyticsDTO.java
package com.baccuisine.baccuisine_backend.dto.response;

import com.baccuisine.baccuisine_backend.enums.MealType;
import com.baccuisine.baccuisine_backend.enums.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsDTO {
    // Core fields
    private LocalDate date;
    private long totalOrders;
    private long pendingOrders;
    private long confirmedOrders;
    private long preparingOrders;
    private long deliveredOrders;
    private long cancelledOrders;

    private Map<MealType, Long> ordersByMealType;
    private long specialRequestCount;

    //  Admin-specific fields
    private long newPatientsToday;
    private long activeStaffCount;
    private double revenueToday;

    //  Nested class for meal stats
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MealStats {
        private String mealName;
        private MealType mealType;   //  Optional: add if you want to include type
        private long orderCount;
        private double popularityPercentage;
    }
}