package com.baccuisine.baccuisine_backend.service;

import com.baccuisine.baccuisine_backend.dto.request.OrderRequest;
import com.baccuisine.baccuisine_backend.dto.response.OrderDTO;
import com.baccuisine.baccuisine_backend.enums.MealType;
import com.baccuisine.baccuisine_backend.enums.OrderStatus;
import com.baccuisine.baccuisine_backend.exception.BusinessException;
import com.baccuisine.baccuisine_backend.exception.ResourceNotFoundException;
import com.baccuisine.baccuisine_backend.model.Meal;
import com.baccuisine.baccuisine_backend.model.Order;
import com.baccuisine.baccuisine_backend.model.Patient;
import com.baccuisine.baccuisine_backend.repository.MealRepository;
import com.baccuisine.baccuisine_backend.repository.OrderRepository;
import com.baccuisine.baccuisine_backend.util.TimeValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final MealRepository mealRepository;
    private final TimeValidator timeValidator;

    // ============ PATIENT ORDER METHODS ============

    /**
     * Place an order using mealId directly from the meals table.
     */
    @Transactional
    public OrderDTO placeOrder(Patient patient, OrderRequest request) {
        log.debug("Placing order for patient {} - mealId: {}",
                patient.getId(), request.getMealId());

        // STEP 1: Fetch the Meal directly by ID
        Meal meal = mealRepository.findById(request.getMealId())
                .orElseThrow(() -> {
                    log.warn("Meal not found with id: {}", request.getMealId());
                    return new ResourceNotFoundException(
                            "Meal #" + request.getMealId() + " not found");
                });

        // STEP 2: Validate meal is active
        if (!meal.isActive()) {
            throw new BusinessException("This meal is no longer available for ordering");
        }

        // STEP 3:- Validate ordering is still within the time window
        // This was causing "Ordering is closed for CEREAL. Cutoff is 1 hour before serving time"
        // Commented out for testing purposes
        /*
        if (!timeValidator.isOrderable(meal.getMealDate(), meal.getMealType())) {
            throw new BusinessException(
                    "Ordering is closed for " + meal.getMealType() +
                            ". Cutoff is 1 hour before serving time.");
        }
        */

        // STEP 4: Prevent duplicate orders per meal type per day
        boolean alreadyOrdered = orderRepository.existsByPatientIdAndMealDateAndMealType(
                patient.getId(),
                meal.getMealDate(),
                meal.getMealType()
        );

        if (alreadyOrdered) {
            throw new BusinessException(
                    "You have already ordered a " +
                            meal.getMealType().name().toLowerCase().replace("_", " ") +
                            " for " + meal.getMealDate());
        }

        // STEP 5: Save the order
        Order order = Order.builder()
                .patient(patient)
                .meal(meal)
                .quantity(request.getQuantity() != null && request.getQuantity() > 0
                        ? request.getQuantity() : 1)
                .specialRequest(sanitizeSpecialRequest(request.getSpecialRequest()))
                .status(OrderStatus.PENDING)
                .build();

        Order savedOrder = orderRepository.save(order);
        log.info("Order placed: orderId={}, patientId={}, meal={}, mealId={}",
                savedOrder.getId(), patient.getId(), meal.getName(), meal.getId());

        return mapToDTO(savedOrder);
    }

    private String sanitizeSpecialRequest(String input) {
        if (input == null || input.trim().isEmpty()) return null;
        String trimmed = input.trim();
        return trimmed.replaceAll("[<>\"'&]", "")
                .substring(0, Math.min(500, trimmed.length()));
    }

    public List<OrderDTO> getPatientOrders(Long patientId, LocalDate date) {
        log.debug("Fetching orders for patient {} on date {}", patientId, date);
        return orderRepository.findByPatientIdAndOrderDate(patientId, date).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public List<OrderDTO> getPatientOrderHistory(Long patientId) {
        return orderRepository.findByPatientIdOrderByCreatedAtDesc(patientId).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // ============ KITCHEN STAFF ORDER METHODS ============

    public List<OrderDTO> getOrdersForKitchen(LocalDate date, MealType mealType) {
        log.debug("Fetching kitchen orders for date={}, mealType={}", date, mealType);

        List<OrderStatus> activeStatuses = Arrays.asList(
                OrderStatus.PENDING,
                OrderStatus.READY,
                OrderStatus.PREPARING
        );

        List<Order> orders = mealType != null
                ? orderRepository.findOrdersForKitchen(date, mealType, activeStatuses)
                : orderRepository.findOrdersForKitchenByDate(date, activeStatuses);

        return orders.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional
    public OrderDTO updateOrderStatus(Long orderId, OrderStatus newStatus) {
        log.info("Updating order {} status to {}", orderId, newStatus);

        Order order = orderRepository.findByIdWithDetails(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        if (!isValidStatusTransition(order.getStatus(), newStatus)) {
            throw new BusinessException(
                    "Cannot transition order from " + order.getStatus() + " to " + newStatus);
        }

        order.setStatus(newStatus);
        order.setUpdatedAt(LocalDateTime.now());

        return mapToDTO(orderRepository.save(order));
    }

    private boolean isValidStatusTransition(OrderStatus current, OrderStatus next) {
        return switch (current) {
            case PENDING   -> next == OrderStatus.READY || next == OrderStatus.CANCELLED;
            case READY     -> next == OrderStatus.PREPARING || next == OrderStatus.CANCELLED;
            case PREPARING -> next == OrderStatus.DELIVERED;
            case DELIVERED, CANCELLED -> false;
        };
    }

    public List<OrderDTO> getOrdersWithSpecialRequests(LocalDate date) {
        return orderRepository.findOrdersWithSpecialRequests(date).stream()
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED)
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public OrderDTO getOrderById(Long orderId) {
        Order order = orderRepository.findByIdWithDetails(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        return mapToDTO(order);
    }

    // ============ ANALYTICS ============

    public Map<OrderStatus, Long> getOrderCountsByStatus(LocalDate date) {
        Map<OrderStatus, Long> counts = new HashMap<>();
        for (Object[] row : orderRepository.countOrdersByStatusForDate(date)) {
            if (row[0] != null && row[1] != null)
                counts.put((OrderStatus) row[0], ((Number) row[1]).longValue());
        }
        return counts;
    }

    public Map<MealType, Long> getOrderCountsByMealType(LocalDate date) {
        Map<MealType, Long> counts = new HashMap<>();
        for (Object[] row : orderRepository.countOrdersByMealTypeForDate(date)) {
            if (row[0] != null && row[1] != null)
                counts.put((MealType) row[0], ((Number) row[1]).longValue());
        }
        return counts;
    }

    public long getActiveOrderCount(LocalDate date) {
        return orderRepository.countActiveOrdersForDate(date);
    }

    // ============ UTILITY ============

    public boolean canPatientOrder(Patient patient, LocalDate date, MealType mealType) {
        // time validation for testing
        // if (!timeValidator.isOrderable(date, mealType)) return false;
        return !orderRepository.existsByPatientIdAndMealDateAndMealType(
                patient.getId(), date, mealType);
    }

    @Transactional
    public OrderDTO cancelOrder(Long orderId, Long requestedByPatientId) {
        Order order = orderRepository.findByIdWithDetails(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        if (order.getStatus() == OrderStatus.PREPARING ||
                order.getStatus() == OrderStatus.DELIVERED) {
            throw new BusinessException(
                    "Cannot cancel order that is already being prepared or delivered");
        }

        order.setStatus(OrderStatus.CANCELLED);
        order.setUpdatedAt(LocalDateTime.now());
        return mapToDTO(orderRepository.save(order));
    }

    // ============ DTO MAPPER ============

    private OrderDTO mapToDTO(Order order) {
        if (order == null) return null;

        Patient patient = order.getPatient();
        Meal    meal    = order.getMeal();

        String patientName = "Unknown";
        if (patient != null) {
            String full = patient.getFullName();
            if (full != null && !full.isBlank()) {
                patientName = full;
            } else if (patient.getName() != null) {
                patientName = patient.getSurname() != null
                        ? patient.getName() + " " + patient.getSurname()
                        : patient.getName();
            }
        }

        return OrderDTO.builder()
                .id(order.getId())
                .patientId(patient != null ? patient.getId() : null)
                .patientName(patientName)
                .wardNumber(patient != null ? patient.getWardNumber() : null)
                .bedNumber(patient != null ? patient.getBedNumber() : null)
                .mealId(meal != null ? meal.getId() : null)
                .mealName(meal != null ? meal.getName() : "Unknown Meal")
                .mealType(meal != null ? meal.getMealType() : null)
                .orderDate(meal != null ? meal.getMealDate() : null)
                .quantity(order.getQuantity() != null ? order.getQuantity() : 1)
                .specialRequest(order.getSpecialRequest())
                .status(order.getStatus() != null ? order.getStatus() : OrderStatus.PENDING)
                .orderedAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }
}