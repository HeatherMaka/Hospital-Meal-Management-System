// src/main/java/com/baccuisine/baccuisine_backend/repository/OrderRepository.java
package com.baccuisine.baccuisine_backend.repository;

import com.baccuisine.baccuisine_backend.enums.MealType;
import com.baccuisine.baccuisine_backend.enums.OrderStatus;
import com.baccuisine.baccuisine_backend.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    // ============ Patient Order Queries ============

    @Query("SELECT o FROM Order o WHERE o.patient.id = :patientId AND o.dailyMenu.menuDate = :date ORDER BY o.createdAt DESC")
    List<Order> findByPatientIdAndOrderDate(@Param("patientId") Long patientId, @Param("date") LocalDate date);

    boolean existsByPatientIdAndDailyMenuMenuDateAndDailyMenuMealMealType(
            @Param("patientId") Long patientId,
            @Param("date") LocalDate date,
            @Param("mealType") MealType mealType);

    @Query("SELECT o FROM Order o JOIN FETCH o.patient JOIN FETCH o.dailyMenu dm JOIN FETCH dm.meal WHERE o.id = :orderId")
    Optional<Order> findByIdWithDetails(@Param("orderId") Long orderId);


    // ============ Kitchen Staff Order Queries ============

    @Query("""

            SELECT o FROM Order o 
        JOIN FETCH o.patient p 
        JOIN FETCH o.dailyMenu dm 
        JOIN FETCH dm.meal m 
        WHERE dm.menuDate = :date 
          AND m.mealType = :mealType 
          AND o.status IN :statuses
        ORDER BY p.wardNumber, p.bedNumber, o.createdAt
        """)
    List<Order> findOrdersForKitchen(
            @Param("date") LocalDate date,
            @Param("mealType") MealType mealType,
            @Param("statuses") List<OrderStatus> statuses);

    @Query("""
        SELECT o FROM Order o 
        JOIN FETCH o.patient p 
        JOIN FETCH o.dailyMenu dm 
        JOIN FETCH dm.meal m 
        WHERE dm.menuDate = :date 
          AND o.status IN :statuses
        ORDER BY m.mealType, p.wardNumber, p.bedNumber
        """)
    List<Order> findOrdersForKitchenByDate(
            @Param("date") LocalDate date,
            @Param("statuses") List<OrderStatus> statuses);

    @Query("""
        SELECT o FROM Order o 
        JOIN FETCH o.patient p 
        JOIN FETCH o.dailyMenu dm 
        JOIN FETCH dm.meal m 
        WHERE dm.menuDate = :date 
          AND o.specialRequest IS NOT NULL 
          AND o.specialRequest != ''
        ORDER BY o.createdAt DESC
        """)
    List<Order> findOrdersWithSpecialRequests(@Param("date") LocalDate date);

    List<Order> findByDailyMenuMenuDateAndStatusOrderByCreatedAtAsc(LocalDate date, OrderStatus status);


    // ============ Analytics Queries ============

    @Query("SELECT COUNT(o) FROM Order o WHERE o.dailyMenu.menuDate = :date")
    long countByOrderDate(@Param("date") LocalDate date);

    @Query("SELECT o.status, COUNT(o) FROM Order o WHERE o.dailyMenu.menuDate = :date GROUP BY o.status")
    List<Object[]> countOrdersByStatusForDate(@Param("date") LocalDate date);

    //  SINGLE DEFINITION - Removed duplicate
    long countByDailyMenuMenuDateAndStatus(LocalDate date, OrderStatus status);

    @Query("SELECT COUNT(o) FROM Order o WHERE o.dailyMenu.menuDate = :date AND o.specialRequest IS NOT NULL AND o.specialRequest != ''")
    long countByOrderDateAndSpecialRequestIsNotNull(@Param("date") LocalDate date);

    @Query("""
        SELECT m.mealType, COUNT(o) 
        FROM Order o 
        JOIN o.dailyMenu dm 
        JOIN dm.meal m 
        WHERE dm.menuDate = :date 
        GROUP BY m.mealType
        """)
    List<Object[]> countOrdersByMealTypeForDate(@Param("date") LocalDate date);

    @Query("""
        SELECT m.name, COUNT(o) 
        FROM Order o 
        JOIN o.dailyMenu dm 
        JOIN dm.meal m 
        WHERE dm.menuDate BETWEEN :startDate AND :endDate 
        GROUP BY m.id, m.name 
        ORDER BY COUNT(o) DESC
        """)
    List<Object[]> countOrdersByMealNameAndDateRange(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);

    @Query(value = """
        SELECT HOUR(o.created_at) as hour, COUNT(o.id) as count 
        FROM orders o 
        WHERE DATE(o.created_at) = :date 
        GROUP BY HOUR(o.created_at)
        ORDER BY hour
        """, nativeQuery = true)
    List<Object[]> countOrdersByHourForDateNative(@Param("date") LocalDate date);

    @Query("""
        SELECT AVG(cnt) FROM (
            SELECT COUNT(o) as cnt
            FROM Order o
            WHERE o.dailyMenu.menuDate BETWEEN :startDate AND :endDate
            GROUP BY o.patient.id
        )
        """)
    Double averageOrdersPerPatientForDateRange(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate);


    // ============ Utility Queries ============

    List<Order> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    List<Order> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    void deleteByPatientId(Long patientId);

    long count();

    @Query("SELECT COUNT(o) FROM Order o WHERE o.dailyMenu.menuDate = :date AND o.status != 'CANCELLED'")
    long countActiveOrdersForDate(@Param("date") LocalDate date);

    }