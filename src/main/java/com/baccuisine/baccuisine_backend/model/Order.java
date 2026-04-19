// src/main/java/com/baccuisine/baccuisine_backend/model/Order.java
package com.baccuisine.baccuisine_backend.model;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "daily_menu_id", nullable = false)
    private DailyMenu dailyMenu;  // Links to DailyMenu (which has meal + menuDate)

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
     *  Get the meal directly from this order via DailyMenu
     */
    @Transient
    public Meal getMeal() {
        return dailyMenu != null ? dailyMenu.getMeal() : null;
    }

    /**
     *  Get the order/serving date directly from DailyMenu
     * FIXED: Use getMenuDate() not getDate() to match DailyMenu entity
     */
    @Transient
    public LocalDate getOrderDate() {
        return dailyMenu != null ? dailyMenu.getMenuDate() : null;  // FIXED HERE
    }

    /**
     *  Get meal type for this order
     */
    @Transient
    public com.baccuisine.baccuisine_backend.enums.MealType getMealType() {
        return dailyMenu != null ? dailyMenu.getMealType() : null;
    }

    /**
     *  Check if this order is for today
     */
    @Transient
    public boolean isForToday() {
        LocalDate orderDate = getOrderDate();
        return orderDate != null && orderDate.equals(LocalDate.now());
    }

    /**
     *  Update timestamp when status changes
     */
    public void markUpdated() {
        this.updatedAt = LocalDateTime.now();
    }
}