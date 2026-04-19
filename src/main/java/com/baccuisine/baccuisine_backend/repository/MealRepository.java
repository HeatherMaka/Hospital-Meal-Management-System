package com.baccuisine.baccuisine_backend.repository;

import com.baccuisine.baccuisine_backend.enums.DietaryType;
import com.baccuisine.baccuisine_backend.enums.MealType;
import com.baccuisine.baccuisine_backend.enums.Role;
import com.baccuisine.baccuisine_backend.model.Meal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface MealRepository extends JpaRepository<Meal, Long> {

    List<Meal> findByIsActiveTrueOrderByMealType();
    List<Meal> findByMealTypeAndIsActiveTrue(MealType mealType);

    @Query("SELECT m FROM Meal m WHERE m.isActive = true AND :dietaryType MEMBER OF m.compatibleDiets")
    List<Meal> findByDietaryCompatibility(@Param("dietaryType") DietaryType dietaryType);

    @Query("SELECT m FROM Meal m WHERE m.isActive = true AND m.mealType = :mealType AND :dietaryType MEMBER OF m.compatibleDiets")
    List<Meal> findByMealTypeAndDietaryCompatibility(
            @Param("mealType") MealType mealType,
            @Param("dietaryType") DietaryType dietaryType);

    // ============ Patient Menu Queries ============

    @Query("SELECT m FROM Meal m WHERE m.isActive = true AND m.mealDate = :date")
    List<Meal> findByMealDateAndIsActiveTrue(@Param("date") LocalDate date);

    @Query("SELECT m FROM Meal m WHERE m.isActive = true AND m.mealDate = :date AND m.createdByRole = :role")
    List<Meal> findByMealDateAndCreatedByRoleAndIsActiveTrue(
            @Param("date") LocalDate date,
            @Param("role") Role role);

    @Query("SELECT m FROM Meal m WHERE m.isActive = true AND m.mealDate = :date AND (m.orderDeadline IS NULL OR m.orderDeadline > :currentTime)")
    List<Meal> findByMealDateAndIsActiveAndOrderable(
            @Param("date") LocalDate date,
            @Param("currentTime") LocalTime currentTime);

    @Query("""
        SELECT m FROM Meal m 
        WHERE m.isActive = true 
          AND m.mealDate = :date 
          AND m.createdByRole = :creatorRole
          AND (m.orderDeadline IS NULL OR m.orderDeadline > :currentTime)
          AND (:dietaryType IS NULL OR :dietaryType MEMBER OF m.compatibleDiets)
        ORDER BY m.mealType, m.name
        """)
    List<Meal> findAvailableMealsForPatient(
            @Param("date") LocalDate date,
            @Param("creatorRole") Role creatorRole,
            @Param("currentTime") LocalTime currentTime,
            @Param("dietaryType") DietaryType dietaryType);

    // ============ Kitchen Staff Queries ============

    List<Meal> findByMealDateAndMealTypeAndIsActiveTrue(LocalDate date, MealType mealType);
}