package com.baccuisine.baccuisine_backend.dto.response;

import com.baccuisine.baccuisine_backend.enums.OrderStatus;
import com.baccuisine.baccuisine_backend.enums.MealType;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderDTO {

    private Long id;

    // Patient Info
    private Long patientId;
    private Long mealId;
    private String patientName;
    private String wardNumber;
    private String bedNumber;
    private long quantity;

    // Meal Info
    private String mealName;
    private MealType mealType;
    private LocalDate orderDate; // Date of the menu

    // Order Details
    private OrderStatus status;
    private String specialRequest;
    private LocalDateTime orderedAt;
    private LocalDateTime updatedAt;
}