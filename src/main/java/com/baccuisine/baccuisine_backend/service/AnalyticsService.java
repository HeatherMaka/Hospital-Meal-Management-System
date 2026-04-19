// src/main/java/com/baccuisine/baccuisine_backend/service/AnalyticsService.java
package com.baccuisine.baccuisine_backend.service;

import com.baccuisine.baccuisine_backend.dto.response.AnalyticsDTO;
import com.baccuisine.baccuisine_backend.enums.MealType;
import com.baccuisine.baccuisine_backend.enums.OrderStatus;
import com.baccuisine.baccuisine_backend.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsService {

    private final OrderRepository orderRepository;

    /**
     *  Get kitchen dashboard analytics for a specific date
     */
    public AnalyticsDTO getKitchenDashboardAnalytics(LocalDate date) {
        log.debug("Fetching kitchen analytics for date: {}", date);

        // Basic counts - use consistent OrderStatus values
        long totalOrders = orderRepository.countByOrderDate(date);
        long pendingOrders = orderRepository.countByDailyMenuMenuDateAndStatus(date, OrderStatus.PENDING);
        long confirmedOrders = orderRepository.countByDailyMenuMenuDateAndStatus(date, OrderStatus.READY);  // ✅ Use CONFIRMED
        long preparingOrders = orderRepository.countByDailyMenuMenuDateAndStatus(date, OrderStatus.PREPARING);
        long deliveredOrders = orderRepository.countByDailyMenuMenuDateAndStatus(date, OrderStatus.DELIVERED);
        long cancelledOrders = orderRepository.countByDailyMenuMenuDateAndStatus(date, OrderStatus.CANCELLED);

        //  Convert List<Object[]> to Map<MealType, Long>
        List<Object[]> mealTypeResults = orderRepository.countOrdersByMealTypeForDate(date);
        Map<MealType, Long> ordersByMealType = new HashMap<>();
        for (Object[] row : mealTypeResults) {
            if (row[0] != null && row[1] != null) {
                MealType mealType = (MealType) row[0];
                Long count = ((Number) row[1]).longValue();  //  Safe conversion
                ordersByMealType.put(mealType, count);
            }
        }

        // Ensure all meal types are represented (even with 0 orders)
        for (MealType type : MealType.values()) {
            ordersByMealType.putIfAbsent(type, 0L);
        }

        long specialRequestCount = orderRepository.countByOrderDateAndSpecialRequestIsNotNull(date);

        return AnalyticsDTO.builder()
                .date(date)
                .totalOrders(totalOrders)
                .pendingOrders(pendingOrders)
                .confirmedOrders(confirmedOrders)
                .preparingOrders(preparingOrders)
                .deliveredOrders(deliveredOrders)
                .cancelledOrders(cancelledOrders)
                .ordersByMealType(ordersByMealType)
                .specialRequestCount(specialRequestCount)
                .build();
    }

    /**
     *  Get meal popularity stats for date range (for menu planning)
     */
    public List<AnalyticsDTO.MealStats> getMealPopularityStats(LocalDate startDate, LocalDate endDate) {
        log.debug("Fetching meal popularity stats from {} to {}", startDate, endDate);

        List<Object[]> results = orderRepository.countOrdersByMealNameAndDateRange(startDate, endDate);

        if (results == null || results.isEmpty()) {
            return new ArrayList<>();
        }

        // Calculate total orders for percentage calculation
        long totalOrders = results.stream()
                .mapToLong(r -> r[1] != null ? ((Number) r[1]).longValue() : 0L)
                .sum();

        return results.stream()
                .filter(r -> r[0] != null)  //  Filter out null meal names
                .map(r -> {
                    String mealName = (String) r[0];
                    Long count = r[1] != null ? ((Number) r[1]).longValue() : 0L;
                    double percentage = totalOrders > 0 ? (count * 100.0 / totalOrders) : 0.0;

                    return AnalyticsDTO.MealStats.builder()
                            .mealName(mealName)
                            .orderCount(count)
                            .popularityPercentage(Math.round(percentage * 100.0) / 100.0)
                            .build();
                })
                .sorted(Comparator.comparingLong(AnalyticsDTO.MealStats::getOrderCount).reversed())
                .collect(Collectors.toList());
    }

    /**
     *  Get admin dashboard analytics (broader view than kitchen)
     */
    public AnalyticsDTO getAdminDashboardAnalytics(LocalDate date) {
        log.debug("Fetching admin analytics for date: {}", date);

        // Reuse kitchen analytics as base
        AnalyticsDTO kitchenStats = getKitchenDashboardAnalytics(date);

        // TODO: Inject repositories for these metrics
        // private final PatientRepository patientRepository;
        // private final UserRepository userRepository;

        long newPatientsToday = 0; // patientRepository.countByCreatedAtBetween(date.atStartOfDay(), date.plusDays(1).atStartOfDay());
        long activeStaffCount = 0;  // userRepository.countByRoleAndIsActiveTrue(Role.STAFF);

        return AnalyticsDTO.builder()
                .date(date)
                .totalOrders(kitchenStats.getTotalOrders())
                .pendingOrders(kitchenStats.getPendingOrders())
                .confirmedOrders(kitchenStats.getConfirmedOrders())
                .preparingOrders(kitchenStats.getPreparingOrders())
                .deliveredOrders(kitchenStats.getDeliveredOrders())
                .cancelledOrders(kitchenStats.getCancelledOrders())
                .ordersByMealType(kitchenStats.getOrdersByMealType())
                .specialRequestCount(kitchenStats.getSpecialRequestCount())
                // Admin-specific fields
                .newPatientsToday(newPatientsToday)
                .activeStaffCount(activeStaffCount)
                .revenueToday(0.0)  // TODO: Calculate from order quantities × meal prices
                .build();
    }

    /**
     *  Get analytics for a date range (for trend charts)
     */
    public List<AnalyticsDTO> getAnalyticsForDateRange(LocalDate startDate, LocalDate endDate) {
        log.debug("Fetching analytics for date range: {} to {}", startDate, endDate);

        List<AnalyticsDTO> results = new ArrayList<>();
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            results.add(getAdminDashboardAnalytics(date));
        }
        return results;
    }

    /**
     *  Get top meals report (reusable for admin/kitchen)
     */
    public List<AnalyticsDTO.MealStats> getTopMeals(LocalDate startDate, LocalDate endDate) {
        log.debug("Fetching top meals from {} to {}", startDate, endDate);
        return getMealPopularityStats(startDate, endDate);
    }

    /**
     *  Get hourly order distribution for kitchen staffing
     */
    public Map<Integer, Long> getHourlyOrderDistribution(LocalDate date) {
        log.debug("Fetching hourly order distribution for date: {}", date);

        List<Object[]> results = orderRepository.countOrdersByHourForDateNative(date);

        if (results == null) {
            results = new ArrayList<>();
        }

        Map<Integer, Long> hourlyCounts = new HashMap<>();
        for (Object[] row : results) {
            if (row[0] != null && row[1] != null) {
                Integer hour = ((Number) row[0]).intValue();
                Long count = ((Number) row[1]).longValue();
                hourlyCounts.put(hour, count);
            }
        }

        // Fill in missing hours with 0
        for (int hour = 0; hour < 24; hour++) {
            hourlyCounts.putIfAbsent(hour, 0L);
        }

        return hourlyCounts;
    }

    /**
     *  Get order status breakdown for a date
     */
    public Map<OrderStatus, Long> getOrderStatusBreakdown(LocalDate date) {
        log.debug("Fetching order status breakdown for date: {}", date);

        List<Object[]> results = orderRepository.countOrdersByStatusForDate(date);

        if (results == null) {
            results = new ArrayList<>();
        }

        Map<OrderStatus, Long> statusCounts = new HashMap<>();
        for (Object[] row : results) {
            if (row[0] != null && row[1] != null) {
                OrderStatus status = (OrderStatus) row[0];
                Long count = ((Number) row[1]).longValue();
                statusCounts.put(status, count);
            }
        }

        // Ensure all statuses are represented
        for (OrderStatus status : OrderStatus.values()) {
            statusCounts.putIfAbsent(status, 0L);
        }

        return statusCounts;
    }
}