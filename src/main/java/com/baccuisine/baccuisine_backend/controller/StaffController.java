package com.baccuisine.baccuisine_backend.controller;

import com.baccuisine.baccuisine_backend.dto.request.DailyMenuRequest;
import com.baccuisine.baccuisine_backend.dto.response.AnalyticsDTO;
import com.baccuisine.baccuisine_backend.dto.response.DailyMenuDTO;
import com.baccuisine.baccuisine_backend.dto.response.OrderDTO;
import com.baccuisine.baccuisine_backend.enums.MealType;
import com.baccuisine.baccuisine_backend.enums.OrderStatus;
import com.baccuisine.baccuisine_backend.model.User;
import com.baccuisine.baccuisine_backend.service.AnalyticsService;
import com.baccuisine.baccuisine_backend.service.DailyMenuService;
import com.baccuisine.baccuisine_backend.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/staff")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('STAFF', 'KITCHEN_STAFF', 'ADMIN')")
@CrossOrigin(origins = "http://localhost:5173")
public class StaffController {

    private final DailyMenuService dailyMenuService;
    private final OrderService orderService;
    private final AnalyticsService analyticsService;

    // ============ Daily Menu Management ============

    @PostMapping("/menu")
    public ResponseEntity<DailyMenuDTO> addToDailyMenu(
            @AuthenticationPrincipal User authenticatedUser,
            @Valid @RequestBody DailyMenuRequest request) {

        request.setCreatedById(authenticatedUser.getId());
        DailyMenuDTO result = dailyMenuService.addToDailyMenu(request);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/menu")
    public ResponseEntity<List<DailyMenuDTO>> getDailyMenu(
            @RequestParam LocalDate date) {
        List<DailyMenuDTO> menus = dailyMenuService.getDailyMenusByDate(date);
        return ResponseEntity.ok(menus);
    }

    @GetMapping("/menu/{mealType}")
    public ResponseEntity<DailyMenuDTO> getDailyMenuByType(
            @RequestParam LocalDate date,
            @PathVariable MealType mealType) {
        DailyMenuDTO menu = dailyMenuService.getDailyMenuByDateAndType(date, mealType);
        return ResponseEntity.ok(menu);
    }

    @DeleteMapping("/menu/meals/{mealId}")
    public ResponseEntity<?> removeFromDailyMenu(@PathVariable Long mealId) {
        dailyMenuService.deactivateMeal(mealId);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/menu/meals/{mealId}")
    public ResponseEntity<?> updateMealInDailyMenu(
            @PathVariable Long mealId,
            @Valid @RequestBody DailyMenuRequest.MealUpdateRequest updateRequest) {
        dailyMenuService.updateMeal(mealId, updateRequest);
        return ResponseEntity.ok().build();
    }

    // ============ Order Management ============

    @GetMapping("/orders")
    public ResponseEntity<List<OrderDTO>> getOrders(
            @RequestParam LocalDate date,
            @RequestParam MealType mealType) {
        return ResponseEntity.ok(orderService.getOrdersForKitchen(date, mealType));
    }

    @GetMapping("/orders/all")
    public ResponseEntity<List<OrderDTO>> getAllOrdersForDate(
            @RequestParam LocalDate date) {
        return ResponseEntity.ok(orderService.getOrdersForKitchen(date, null));
    }

    @PatchMapping("/orders/{id}/status")
    public ResponseEntity<OrderDTO> updateOrderStatus(
            @PathVariable Long id,
            @RequestParam OrderStatus status) {
        return ResponseEntity.ok(orderService.updateOrderStatus(id, status));
    }

    @GetMapping("/orders/special-requests")
    public ResponseEntity<List<OrderDTO>> getSpecialRequests(
            @RequestParam LocalDate date) {
        return ResponseEntity.ok(orderService.getOrdersWithSpecialRequests(date));
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<OrderDTO> getOrderById(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    // ============ Analytics ============

    @GetMapping("/analytics")
    public ResponseEntity<AnalyticsDTO> getKitchenAnalytics(
            @RequestParam(required = false) LocalDate date) {
        if (date == null) date = LocalDate.now();
        AnalyticsDTO analytics = analyticsService.getKitchenDashboardAnalytics(date);
        return ResponseEntity.ok(analytics);
    }

    @GetMapping("/analytics/meals")
    public ResponseEntity<List<AnalyticsDTO.MealStats>> getMealPopularity(
            @RequestParam(required = false) LocalDate startDate,
            @RequestParam(required = false) LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now().minusDays(7);
        if (endDate == null) endDate = LocalDate.now();
        List<AnalyticsDTO.MealStats> stats = analyticsService.getMealPopularityStats(startDate, endDate);
        return ResponseEntity.ok(stats);
    }
}