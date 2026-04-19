// src/main/java/com/baccuisine/baccuisine_backend/service/OrderService.java
package com.baccuisine.baccuisine_backend.service;

import com.baccuisine.baccuisine_backend.dto.request.OrderRequest;
import com.baccuisine.baccuisine_backend.dto.response.OrderDTO;
import com.baccuisine.baccuisine_backend.enums.MealType;
import com.baccuisine.baccuisine_backend.enums.OrderStatus;
import com.baccuisine.baccuisine_backend.exception.BusinessException;
import com.baccuisine.baccuisine_backend.exception.ResourceNotFoundException;
import com.baccuisine.baccuisine_backend.model.DailyMenu;
import com.baccuisine.baccuisine_backend.model.Meal;
import com.baccuisine.baccuisine_backend.model.Order;
import com.baccuisine.baccuisine_backend.model.Patient;
import com.baccuisine.baccuisine_backend.repository.DailyMenuRepository;
import com.baccuisine.baccuisine_backend.repository.OrderRepository;
import com.baccuisine.baccuisine_backend.util.TimeValidator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final DailyMenuRepository dailyMenuRepository;
    private final TimeValidator timeValidator;

    // ============ PATIENT ORDER METHODS ============

    @Transactional
    public OrderDTO placeOrder(Patient patient, OrderRequest request) {
        log.debug("Placing order for patient {} - dailyMenuId: {}",
                patient.getId(), request.getDailyMenuId());

        DailyMenu dailyMenu = dailyMenuRepository.findById(request.getDailyMenuId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Menu item not found with id: " + request.getDailyMenuId()));

        if (!dailyMenu.isActive()) {
            throw new BusinessException("This meal is no longer available for ordering");
        }

        Meal meal = dailyMenu.getMeal();
        if (meal == null || !meal.isActive()) {
            throw new BusinessException("This meal is no longer available");
        }

        if (!timeValidator.isOrderable(dailyMenu.getMenuDate(), meal.getMealType())) {
            throw new BusinessException(
                    "Ordering closed for " + meal.getMealType() +
                            ". Cutoff is 1 hour before serving time.");
        }

        // CORRECT method name with 'MenuDate' and 'MealMealType'
        boolean alreadyOrdered = orderRepository.existsByPatientIdAndDailyMenuMenuDateAndDailyMenuMealMealType(
                patient.getId(),
                dailyMenu.getMenuDate(),
                meal.getMealType()
        );

        if (alreadyOrdered) {
            throw new BusinessException(
                    "You have already ordered a " + meal.getMealType().name().toLowerCase() +
                            " for " + dailyMenu.getMenuDate());
        }

        Order order = Order.builder()
                .patient(patient)
                .dailyMenu(dailyMenu)
                .quantity(request.getQuantity() != null && request.getQuantity() > 0
                        ? request.getQuantity() : 1)
                .specialRequest(sanitizeSpecialRequest(request.getSpecialRequest()))
                .status(OrderStatus.PENDING)
                .build();

        Order savedOrder = orderRepository.save(order);
        log.info("Order placed: orderId={}, patientId={}, meal={}",
                savedOrder.getId(), patient.getId(), meal.getName());

        return mapToDTO(savedOrder);
    }

    private String sanitizeSpecialRequest(String input) {
        if (input == null || input.trim().isEmpty()) {
            return null;
        }
        return input.trim().replaceAll("[<>\"'&]", "")
                .substring(0, Math.min(500, input.length()));
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

        //  Use consistent OrderStatus values (CONFIRMED not READY)
        List<OrderStatus> activeStatuses = Arrays.asList(
                OrderStatus.PENDING,
                OrderStatus.READY,
                OrderStatus.PREPARING
        );

        List<Order> orders;
        if (mealType != null) {
            orders = orderRepository.findOrdersForKitchen(date, mealType, activeStatuses);
        } else {
            orders = orderRepository.findOrdersForKitchenByDate(date, activeStatuses);
        }

        return orders.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional
    public OrderDTO updateOrderStatus(Long orderId, OrderStatus newStatus) {
        log.info("Updating order {} status to {}", orderId, newStatus);

        // findByIdWithDetails now returns Optional<Order>
        Order order = orderRepository.findByIdWithDetails(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        if (!isValidStatusTransition(order.getStatus(), newStatus)) {
            throw new BusinessException(
                    "Cannot transition order from " + order.getStatus() + " to " + newStatus);
        }

        order.setStatus(newStatus);
        order.setUpdatedAt(LocalDateTime.now());

        Order updated = orderRepository.save(order);
        log.debug("Order {} status updated: {} → {}", orderId, order.getStatus(), newStatus);

        return mapToDTO(updated);
    }

    private boolean isValidStatusTransition(OrderStatus current, OrderStatus next) {
        return switch (current) {
            case PENDING -> next == OrderStatus.READY || next == OrderStatus.CANCELLED;
            case READY -> next == OrderStatus.PREPARING || next == OrderStatus.CANCELLED;
            case PREPARING -> next == OrderStatus.DELIVERED;
            case DELIVERED, CANCELLED -> false; // Terminal states
        };
    }

    public List<OrderDTO> getOrdersWithSpecialRequests(LocalDate date) {
        log.debug("Fetching orders with special requests for date {}", date);
        return orderRepository.findOrdersWithSpecialRequests(date).stream()
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED)
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public OrderDTO getOrderById(Long orderId) {
        log.debug("Fetching order details for id {}", orderId);

        // Use Optional return type
        Order order = orderRepository.findByIdWithDetails(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
        return mapToDTO(order);
    }

    // ============ ANALYTICS & REPORTING ============

    public java.util.Map<OrderStatus, Long> getOrderCountsByStatus(LocalDate date) {
        List<Object[]> results = orderRepository.countOrdersByStatusForDate(date);
        java.util.Map<OrderStatus, Long> counts = new java.util.HashMap<>();
        for (Object[] row : results) {
            if (row[0] != null && row[1] != null) {
                OrderStatus status = (OrderStatus) row[0];
                Long count = ((Number) row[1]).longValue();
                counts.put(status, count);
            }
        }
        return counts;
    }

    public java.util.Map<MealType, Long> getOrderCountsByMealType(LocalDate date) {
        List<Object[]> results = orderRepository.countOrdersByMealTypeForDate(date);
        java.util.Map<MealType, Long> counts = new java.util.HashMap<>();
        for (Object[] row : results) {
            if (row[0] != null && row[1] != null) {
                MealType mealType = (MealType) row[0];
                Long count = ((Number) row[1]).longValue();
                counts.put(mealType, count);
            }
        }
        return counts;
    }

    public long getActiveOrderCount(LocalDate date) {
        return orderRepository.countActiveOrdersForDate(date);
    }

    // ============ UTILITY METHODS ============

    public boolean canPatientOrder(Patient patient, LocalDate date, MealType mealType) {
        if (!timeValidator.isOrderable(date, mealType)) {
            return false;
        }
        //  Use CORRECT method name
        return !orderRepository.existsByPatientIdAndDailyMenuMenuDateAndDailyMenuMealMealType(
                patient.getId(), date, mealType);
    }

    @Transactional
    public OrderDTO cancelOrder(Long orderId, Long requestedByPatientId) {
        Order order = orderRepository.findByIdWithDetails(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));

        if (!order.getPatient().getId().equals(requestedByPatientId)) {
            // Optional: Add role check here if needed
        }

        if (order.getStatus() == OrderStatus.PREPARING ||
                order.getStatus() == OrderStatus.DELIVERED) {
            throw new BusinessException("Cannot cancel order that is already being prepared or delivered");
        }

        order.setStatus(OrderStatus.CANCELLED);
        order.setUpdatedAt(LocalDateTime.now());

        return mapToDTO(orderRepository.save(order));
    }

    // ============ DTO MAPPER ============

    private OrderDTO mapToDTO(Order order) {
        if (order == null) return null;

        Patient patient = order.getPatient();
        DailyMenu dailyMenu = order.getDailyMenu();
        Meal meal = dailyMenu != null ? dailyMenu.getMeal() : null;

        // Build patient name safely
        String patientName = "Unknown";
        if (patient != null) {
            if (patient.getFullName() != null && !patient.getFullName().isEmpty()) {
                patientName = patient.getFullName();
            } else if (patient.getName() != null && patient.getSurname() != null) {
                patientName = patient.getName() + " " + patient.getSurname();
            } else if (patient.getName() != null) {
                patientName = patient.getName();
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
                .mealType(dailyMenu != null ? dailyMenu.getMealType() : null)
                .orderDate(dailyMenu != null ? dailyMenu.getMenuDate() : null)
                .quantity(order.getQuantity() != null ? order.getQuantity() : 1)
                .specialRequest(order.getSpecialRequest())
                .status(order.getStatus() != null ? order.getStatus() : OrderStatus.PENDING)
                .orderedAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }
}