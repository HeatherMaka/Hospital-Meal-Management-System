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

    /**
     * Fetch meals for the patient menu.
     *
     * Fixes applied vs original query:
     *
     * 1. REMOVED "m.createdByRole = :creatorRole" filter.
     *    Catalog meals created via /api/meals never have createdByRole set
     *    (MealService.createMeal does not assign it), so that filter was
     *    silently excluding every meal → empty patient menu.
     *    Meals are now identified by having a dailyMenu association instead.
     *
     * 2. CHANGED dietary filter from strict MEMBER OF to permissive logic:
     *    Show meal if ANY of these is true:
     *      a) meal has no compatible diets defined (empty set = suitable for all)
     *      b) no patient dietary type provided (null = no restriction)
     *      c) patient's dietary type is in the meal's compatibleDiets set
     *    Previously, a meal with an empty compatibleDiets set would never match
     *    ":dietaryType MEMBER OF m.compatibleDiets", hiding it from every patient.
     *
     * 3. KEPT the orderDeadline check — meals past their deadline stay hidden.
     */
    @Query("""
        SELECT m FROM Meal m
        WHERE m.isActive = true
          AND m.mealDate = :date
          AND (m.orderDeadline IS NULL OR m.orderDeadline > :currentTime)
          AND (
                m.compatibleDiets IS EMPTY
                OR :dietaryType IS NULL
                OR :dietaryType MEMBER OF m.compatibleDiets
              )
        ORDER BY m.mealType, m.name
        """)
    List<Meal> findAvailableMealsForPatient(
            @Param("date") LocalDate date,
            @Param("currentTime") LocalTime currentTime,
            @Param("dietaryType") DietaryType dietaryType);

    // ============ Kitchen Staff Queries ============

    List<Meal> findByMealDateAndMealTypeAndIsActiveTrue(LocalDate date, MealType mealType);
}
