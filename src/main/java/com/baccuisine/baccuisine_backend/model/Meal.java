package com.baccuisine.baccuisine_backend.model;

import com.baccuisine.baccuisine_backend.enums.DietaryType;
import com.baccuisine.baccuisine_backend.enums.MealType;
import com.baccuisine.baccuisine_backend.enums.Role;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "meals")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Meal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MealType mealType;

    @Column(nullable = false)
    private LocalDate mealDate;

    @Column(nullable = false)
    private boolean isActive = true;

    private LocalTime orderDeadline;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "daily_menu_id")
    private DailyMenu dailyMenu;

    @ElementCollection(targetClass = DietaryType.class)
    @CollectionTable(
            name = "meal_compatible_diets",
            joinColumns = @JoinColumn(name = "meal_id")
    )
    @Enumerated(EnumType.STRING)
    @Column(name = "dietary_type")
    private Set<DietaryType> compatibleDiets = new HashSet<>();

    private Long createdById;

    @Enumerated(EnumType.STRING)
    private Role createdByRole;

    @CreatedDate
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public boolean isCompatibleWith(DietaryType patientDiet) {
        if (compatibleDiets == null || compatibleDiets.isEmpty()) {
            return patientDiet == DietaryType.NORMAL;
        }
        return compatibleDiets.contains(patientDiet) || compatibleDiets.contains(DietaryType.NORMAL);
    }

    public boolean isCurrentlyOrderable() {
        if (!isActive) return false;
        if (orderDeadline == null) return true;
        return orderDeadline.isAfter(LocalTime.now());
    }

    public boolean isCreatedByKitchenStaff() {
        return createdByRole == Role.KITCHEN_STAFF;
    }

    public String getOrderDeadlineFormatted() {
        if (orderDeadline == null) return null;
        return String.format("%02d:%02d", orderDeadline.getHour(), orderDeadline.getMinute());
    }
}