package com.baccuisine.baccuisine_backend.controller;

import com.baccuisine.baccuisine_backend.dto.request.OrderRequest;
import com.baccuisine.baccuisine_backend.dto.response.MealDTO;
import com.baccuisine.baccuisine_backend.dto.response.OrderDTO;
import com.baccuisine.baccuisine_backend.exception.BusinessException;
import com.baccuisine.baccuisine_backend.exception.ResourceNotFoundException;
import com.baccuisine.baccuisine_backend.model.Patient;
import com.baccuisine.baccuisine_backend.service.MealService;
import com.baccuisine.baccuisine_backend.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Controller for patient-facing endpoints
 *
 * Handles: meal browsing, order placement, order history, profile management
 * Security: All endpoints require ROLE_PATIENT authentication
 */
@RestController
@RequestMapping("/api/patient")
@RequiredArgsConstructor
@PreAuthorize("hasRole('PATIENT')")
@CrossOrigin(origins = "http://localhost:5173")
@Tag(name = "Patient", description = "Patient-facing operations: meals, orders, profile")
@Slf4j
public class PatientController {

    private final MealService mealService;
    private final OrderService orderService;

    // ============ MEAL ENDPOINTS ============

    /**
     * Get available meals for a specific date, filtered by patient's dietary type
     */
    @GetMapping("/meals")
    @Operation(
            summary = "Get available meals for patient",
            description = "Fetches active meals for the given date, filtered by patient's dietary restrictions"
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Meals retrieved successfully",
                    content = @Content(schema = @Schema(implementation = MealDTO.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid/expired token")
    })
    public ResponseEntity<List<MealDTO>> getMealsForDate(
            @Parameter(hidden = true) @AuthenticationPrincipal Patient patient,
            @Parameter(description = "Date to fetch meals for (YYYY-MM-DD)", required = true, example = "2026-05-15")
            @RequestParam LocalDate date
    ) {
        log.debug("GET /meals requested by patient={} for date={}", patient.getId(), date);

        List<MealDTO> meals = mealService.getAvailableMealsForPatient(date, patient.getDietaryType());
        log.debug("Returning {} meals for patient={}", meals.size(), patient.getId());

        return ResponseEntity.ok(meals);
    }

    //  Alias endpoint for frontend compatibility (calls same service method)
    /**
     * Get available meals for a specific date (alias for /meals)
     * Frontend compatibility endpoint: /api/patient/menu
     */
    @GetMapping("/menu")
    @Operation(
            summary = "Get daily menu for patient",
            description = "Fetches active meals for the given date, filtered by patient's dietary restrictions. Alias for /meals endpoint."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Menu retrieved successfully",
                    content = @Content(schema = @Schema(implementation = MealDTO.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid/expired token")
    })
    public ResponseEntity<List<MealDTO>> getDailyMenu(
            @Parameter(hidden = true) @AuthenticationPrincipal Patient patient,
            @Parameter(description = "Date to fetch menu for (YYYY-MM-DD)", required = true, example = "2026-05-15")
            @RequestParam LocalDate date
    ) {
        log.debug("GET /menu requested by patient={} for date={}", patient.getId(), date);

        List<MealDTO> meals = mealService.getAvailableMealsForPatient(date, patient.getDietaryType());
        log.debug("Returning {} meals for patient={}", meals.size(), patient.getId());

        return ResponseEntity.ok(meals);
    }

    /**
     * Get available meals for the next 7 days
     */
    @GetMapping("/meals/weekly")
    @Operation(
            summary = "Get weekly meals for patient",
            description = "Fetches active meals for the next 7 days, filtered by patient's dietary restrictions"
    )
    public ResponseEntity<List<MealDTO>> getWeeklyMeals(
            @Parameter(hidden = true) @AuthenticationPrincipal Patient patient
    ) {
        log.debug("GET /meals/weekly requested by patient={}", patient.getId());

        LocalDate start = LocalDate.now();
        LocalDate end   = start.plusDays(6);

        List<MealDTO> meals = mealService.getMealsForDateRange(start, end, patient.getDietaryType());
        log.debug("Returning {} meals for weekly view", meals.size());

        return ResponseEntity.ok(meals);
    }


    // ============ ORDER ENDPOINTS ============

    /**
     * Place a new meal order
     */
    @PostMapping("/orders")
    @Operation(
            summary = "Place a new meal order",
            description = "Creates a new order for an available meal. " +
                    "mealId must come from GET /api/patient/meals response."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Order placed successfully",
                    content = @Content(schema = @Schema(implementation = OrderDTO.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request: duplicate order, deadline passed, meal inactive"),
            @ApiResponse(responseCode = "404", description = "Meal not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - invalid/expired token")
    })
    public ResponseEntity<OrderDTO> placeOrder(
            @Parameter(hidden = true) @AuthenticationPrincipal Patient patient,
            @Parameter(description = "Order details", required = true)
            @Valid @RequestBody OrderRequest request
    ) {
        log.info("POST /orders: Patient {} attempting to order mealId={}",
                patient.getId(), request.getMealId());

        try {
            OrderDTO createdOrder = orderService.placeOrder(patient, request);
            log.info("Order created successfully: orderId={} for patient={}",
                    createdOrder.getId(), patient.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(createdOrder);

        } catch (BusinessException | ResourceNotFoundException e) {
            log.warn("Order failed for patient={}: {}", patient.getId(), e.getMessage());
            throw e;
        }
    }

    /**
     * Get patient's orders for a specific date (defaults to today)
     */
    @GetMapping("/orders")
    @Operation(
            summary = "Get patient order history",
            description = "Fetches orders for the authenticated patient. " +
                    "If date is provided, filters to that date; otherwise returns today's orders."
    )
    public ResponseEntity<List<OrderDTO>> getMyOrders(
            @Parameter(hidden = true) @AuthenticationPrincipal Patient patient,
            @Parameter(description = "Optional: Filter orders by date (YYYY-MM-DD). Defaults to today.")
            @RequestParam(required = false) LocalDate date
    ) {
        if (date == null) {
            date = LocalDate.now();
            log.debug("GET /orders: Fetching today's orders for patient={}", patient.getId());
        } else {
            log.debug("GET /orders: Fetching orders for patient={} on date={}", patient.getId(), date);
        }

        List<OrderDTO> orders = orderService.getPatientOrders(patient.getId(), date);
        return ResponseEntity.ok(orders);
    }

    /**
     * Cancel an existing order (if still PENDING or READY)
     */
    @DeleteMapping("/orders/{orderId}")
    @Operation(
            summary = "Cancel an order",
            description = "Cancels an order if it's still in PENDING or READY status."
    )
    public ResponseEntity<OrderDTO> cancelOrder(
            @Parameter(hidden = true) @AuthenticationPrincipal Patient patient,
            @Parameter(description = "ID of the order to cancel", required = true)
            @PathVariable Long orderId
    ) {
        log.info("DELETE /orders/{}: Patient {} attempting to cancel", orderId, patient.getId());

        OrderDTO order = orderService.getOrderById(orderId);
        if (!order.getPatientId().equals(patient.getId())) {
            log.warn("Patient {} attempted to cancel order {} belonging to patient {}",
                    patient.getId(), orderId, order.getPatientId());
            throw new BusinessException("You can only cancel your own orders");
        }

        OrderDTO cancelledOrder = orderService.cancelOrder(orderId, patient.getId());
        log.info("Order {} cancelled successfully by patient={}", orderId, patient.getId());

        return ResponseEntity.ok(cancelledOrder);
    }


    // ============ PROFILE ENDPOINTS ============

    @GetMapping("/profile")
    @Operation(summary = "Get patient profile")
    public ResponseEntity<Patient> getProfile(
            @Parameter(hidden = true) @AuthenticationPrincipal Patient patient
    ) {
        log.debug("GET /profile requested by patient={}", patient.getId());
        return ResponseEntity.ok(patient);
    }

    @PutMapping("/profile")
    @Operation(
            summary = "Update patient profile",
            description = "Updates allowed profile fields: dietaryType, phone, etc."
    )
    public ResponseEntity<Patient> updateProfile(
            @Parameter(hidden = true) @AuthenticationPrincipal Patient patient,
            @Valid @RequestBody Patient updatedPatient
    ) {
        log.info("PUT /profile: Patient {} updating profile", patient.getId());

        if (updatedPatient.getDietaryType() != null) {
            patient.setDietaryType(updatedPatient.getDietaryType());
        }

        return ResponseEntity.ok(patient);
    }
}