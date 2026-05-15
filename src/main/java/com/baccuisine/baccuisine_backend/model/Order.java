package com.baccuisine.baccuisine_backend.model;

import com.baccuisine.baccuisine_backend.enums.MealType;
import com.baccuisine.baccuisine_backend.enums.OrderStatus;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    /**
     * Direct reference to Meal — no longer goes through DailyMenu
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meal_id", nullable = false)
    private Meal meal;

    private Integer quantity;

    private String specialRequest;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status = OrderStatus.PENDING;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    // ============ HELPER METHODS ============

    /**
     * Get the order date from the linked meal's mealDate
     */
    @Transient
    public LocalDate getOrderDate() {
        return meal != null ? meal.getMealDate() : null;
    }

    /**
     * Get meal type for this order
     */
    @Transient
    public MealType getMealType() {
        return meal != null ? meal.getMealType() : null;
    }

    /**
     * Check if this order is for today
     */
    @Transient
    public boolean isForToday() {
        LocalDate orderDate = getOrderDate();
        return orderDate != null && orderDate.equals(LocalDate.now());
    }

    /**
     * Update timestamp when status changes
     */
    public void markUpdated() {
        this.updatedAt = LocalDateTime.now();
    }
}