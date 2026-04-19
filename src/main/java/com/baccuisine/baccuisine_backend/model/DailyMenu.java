// src/main/java/com/baccuisine/baccuisine_backend/model/DailyMenu.java
package com.baccuisine.baccuisine_backend.model;

import com.baccuisine.baccuisine_backend.enums.MealType;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "daily_menus")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class DailyMenu {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate menuDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MealType mealType;

    @Column(nullable = false)
    private boolean isActive = true;

    //  Changed to @ManyToOne to match repository queries (dm.meal)
    // Previously was @ManyToMany Set<Meal> meals, which caused JPQL mismatches
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "meal_id", nullable = false)
    private Meal meal;

    private Long createdById;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    //  Optional helper to auto-set mealType when assigning a meal
    public void setMealAndType(Meal meal) {

    }

    public void addMeal(Meal meal) {
    }
}