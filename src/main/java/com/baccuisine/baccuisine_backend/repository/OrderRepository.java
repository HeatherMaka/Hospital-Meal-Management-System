package com.baccuisine.baccuisine_backend.repository;

import com.baccuisine.baccuisine_backend.enums.MealType;
import com.baccuisine.baccuisine_backend.enums.OrderStatus;
import com.baccuisine.baccuisine_backend.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    /**
     * Fetch a single order with all details eagerly loaded
     */
    @Query("""
            SELECT o FROM Order o
            LEFT JOIN FETCH o.patient
            LEFT JOIN FETCH o.meal
            WHERE o.id = :orderId
            """)
    Optional<Order> findByIdWithDetails(@Param("orderId") Long orderId);

    /**
     * Get all orders for a patient on a specific date
     * Matches on meal.mealDate
     */
    @Query("""
            SELECT o FROM Order o
            LEFT JOIN FETCH o.meal m
            WHERE o.patient.id = :patientId
              AND m.mealDate = :date
            ORDER BY o.createdAt DESC
            """)
    List<Order> findByPatientIdAndOrderDate(
            @Param("patientId") Long patientId,
            @Param("date") LocalDate date
    );

    /**
     * Get full order history for a patient, newest first
     */
    @Query("""
            SELECT o FROM Order o
            LEFT JOIN FETCH o.meal
            WHERE o.patient.id = :patientId
            ORDER BY o.createdAt DESC
            """)
    List<Order> findByPatientIdOrderByCreatedAtDesc(@Param("patientId") Long patientId);

    /**
     * Check if a patient has already ordered a specific meal type on a given date
     */
    @Query("""
            SELECT COUNT(o) > 0 FROM Order o
            WHERE o.patient.id = :patientId
              AND o.meal.mealDate = :mealDate
              AND o.meal.mealType = :mealType
              AND o.status <> com.baccuisine.baccuisine_backend.enums.OrderStatus.CANCELLED
            """)
    boolean existsByPatientIdAndMealDateAndMealType(
            @Param("patientId") Long patientId,
            @Param("mealDate") LocalDate mealDate,
            @Param("mealType") MealType mealType
    );

    /**
     * Kitchen view: get all active orders for a given date and meal type
     */
    @Query("""
            SELECT o FROM Order o
            LEFT JOIN FETCH o.patient
            LEFT JOIN FETCH o.meal m
            WHERE m.mealDate = :date
              AND m.mealType = :mealType
              AND o.status IN :statuses
            ORDER BY o.createdAt ASC
            """)
    List<Order> findOrdersForKitchen(
            @Param("date") LocalDate date,
            @Param("mealType") MealType mealType,
            @Param("statuses") List<OrderStatus> statuses
    );

    /**
     * Kitchen view: get all active orders for a given date (all meal types)
     */
    @Query("""
            SELECT o FROM Order o
            LEFT JOIN FETCH o.patient
            LEFT JOIN FETCH o.meal m
            WHERE m.mealDate = :date
              AND o.status IN :statuses
            ORDER BY m.mealType ASC, o.createdAt ASC
            """)
    List<Order> findOrdersForKitchenByDate(
            @Param("date") LocalDate date,
            @Param("statuses") List<OrderStatus> statuses
    );

    /**
     * Get orders that have special requests for a given date
     */
    @Query("""
            SELECT o FROM Order o
            LEFT JOIN FETCH o.patient
            LEFT JOIN FETCH o.meal m
            WHERE m.mealDate = :date
              AND o.specialRequest IS NOT NULL
              AND o.specialRequest <> ''
            """)
    List<Order> findOrdersWithSpecialRequests(@Param("date") LocalDate date);

    // ═══════════════════════════════════════════════════════════
    //  FIXED METHODS FOR AnalyticsService
    // ═══════════════════════════════════════════════════════════

    /**
     * Count all orders for a given date
     * Uses meal.mealDate based on your entity structure
     */
    @Query("SELECT COUNT(o) FROM Order o JOIN o.meal m WHERE m.mealDate = :date")
    long countByOrderDate(@Param("date") LocalDate date);

    /**
     * Count orders by meal date and status
     */
    @Query("SELECT COUNT(o) FROM Order o JOIN o.meal m WHERE m.mealDate = :menuDate AND o.status = :status")
    long countByDailyMenuMenuDateAndStatus(
            @Param("menuDate") LocalDate menuDate,
            @Param("status") OrderStatus status
    );

    /**
     * Count orders with non-null special requests for a given date
     */
    @Query("SELECT COUNT(o) FROM Order o JOIN o.meal m WHERE m.mealDate = :date AND o.specialRequest IS NOT NULL")
    long countByOrderDateAndSpecialRequestIsNotNull(@Param("date") LocalDate date);

    /**
     * 🔧 FIXED: Count orders grouped by meal NAME for a date range
     * ⚠️ Uses 'm.name' - update to 'm.mealName' if your Meal entity uses that field name
     */
    @Query("""
            SELECT m.name, COUNT(o) FROM Order o
            JOIN o.meal m
            WHERE m.mealDate BETWEEN :startDate AND :endDate
            GROUP BY m.name
            """)
    List<Object[]> countOrdersByMealNameAndDateRange(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    /**
     * Count orders grouped by hour for a given date (native SQL)
     * ⚠️ Adjust table/column names to match your actual database schema
     */
    @Query(value = """
            SELECT HOUR(o.created_at) as hour, COUNT(o.id)
            FROM orders o
            INNER JOIN meal m ON o.meal_id = m.id
            WHERE m.meal_date = :date
            GROUP BY HOUR(o.created_at)
            ORDER BY hour
            """, nativeQuery = true)
    List<Object[]> countOrdersByHourForDateNative(@Param("date") LocalDate date);

    // ═══════════════════════════════════════════════════════════
    //  EXISTING METHODS (kept for reference)
    // ═══════════════════════════════════════════════════════════

    /**
     * Count orders grouped by status for a given date
     */
    @Query("""
            SELECT o.status, COUNT(o) FROM Order o
            JOIN o.meal m
            WHERE m.mealDate = :date
            GROUP BY o.status
            """)
    List<Object[]> countOrdersByStatusForDate(@Param("date") LocalDate date);

    /**
     * Count orders grouped by meal type for a given date
     */
    @Query("""
            SELECT m.mealType, COUNT(o) FROM Order o
            JOIN o.meal m
            WHERE m.mealDate = :date
            GROUP BY m.mealType
            """)
    List<Object[]> countOrdersByMealTypeForDate(@Param("date") LocalDate date);

    /**
     * Count all non-cancelled orders for a given date
     */
    @Query("""
            SELECT COUNT(o) FROM Order o
            JOIN o.meal m
            WHERE m.mealDate = :date
              AND o.status <> com.baccuisine.baccuisine_backend.enums.OrderStatus.CANCELLED
            """)
    long countActiveOrdersForDate(@Param("date") LocalDate date);
}