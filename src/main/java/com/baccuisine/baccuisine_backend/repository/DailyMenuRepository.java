package com.baccuisine.baccuisine_backend.repository;

import com.baccuisine.baccuisine_backend.enums.MealType;
import com.baccuisine.baccuisine_backend.model.DailyMenu;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DailyMenuRepository extends JpaRepository<DailyMenu, Long> {

    Optional<DailyMenu> findByMenuDateAndMealType(LocalDate menuDate, MealType mealType);

    @Query("SELECT dm FROM DailyMenu dm WHERE dm.menuDate = :date AND dm.isActive = true")
    List<DailyMenu> findByMenuDateAndIsActiveTrue(@Param("date") LocalDate date);

    @Query("SELECT dm FROM DailyMenu dm WHERE dm.menuDate BETWEEN :start AND :end AND dm.isActive = true")
    List<DailyMenu> findByMenuDateBetweenAndIsActiveTrue(
            @Param("start") LocalDate startDate,
            @Param("end") LocalDate endDate);

    @Query("SELECT dm FROM DailyMenu dm WHERE dm.mealType = :mealType AND dm.menuDate BETWEEN :start AND :end AND dm.isActive = true")
    List<DailyMenu> findByMealTypeAndMenuDateBetweenAndIsActiveTrue(
            @Param("mealType") MealType mealType,
            @Param("start") LocalDate startDate,
            @Param("end") LocalDate endDate);
}