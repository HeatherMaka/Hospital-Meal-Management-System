package com.baccuisine.baccuisine_backend.service;

import com.baccuisine.baccuisine_backend.dto.request.MealRequest;
import com.baccuisine.baccuisine_backend.dto.response.MealDTO;
import com.baccuisine.baccuisine_backend.enums.DietaryType;
import com.baccuisine.baccuisine_backend.enums.MealType;
import com.baccuisine.baccuisine_backend.model.Meal;
import com.baccuisine.baccuisine_backend.repository.MealRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MealService {

    private final MealRepository mealRepository;

    // ============ Helper Methods ============

    private List<String> mapDietaryTypesToStrings(Set<DietaryType> dietaryTypes) {
        if (dietaryTypes == null || dietaryTypes.isEmpty()) return List.of();
        return dietaryTypes.stream().map(Enum::name).collect(Collectors.toList());
    }

    // ============ Core CRUD Methods ============

    public MealDTO createMeal(MealRequest request) {
        // FIXED: Set default deadline to end of day (23:59) instead of 11:00
        // This ensures meals are orderable throughout the day
        LocalTime deadline = request.getOrderDeadline() != null
                ? request.getOrderDeadline()
                : LocalTime.of(23, 59);  // ← Changed from 11:00 to 23:59

        log.info("Creating meal '{}' with deadline: {}", request.getName(), deadline);

        Meal meal = Meal.builder()
                .name(request.getName())
                .description(request.getDescription())
                .mealType(request.getMealType())
                .mealDate(request.getMealDate() != null ? request.getMealDate() : LocalDate.now())
                .orderDeadline(deadline)
                .compatibleDiets(request.getCompatibleDiets() != null
                        ? request.getCompatibleDiets() : new HashSet<>())
                .isActive(true)
                .build();

        Meal savedMeal = mealRepository.save(meal);
        log.info("Saved meal '{}' - ID: {}", savedMeal.getId(), savedMeal.getName());
        return mapToDTO(savedMeal);
    }

    public List<MealDTO> getAllActiveMeals() {
        return mealRepository.findByIsActiveTrueOrderByMealType().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public List<MealDTO> getMealsByType(MealType mealType) {
        return mealRepository.findByMealTypeAndIsActiveTrue(mealType).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public List<MealDTO> getMealsByDietaryType(DietaryType dietaryType) {
        return mealRepository.findByDietaryCompatibility(dietaryType).stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public MealDTO getMealById(Long id) {
        Meal meal = mealRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Meal not found with id: " + id));
        return mapToDTO(meal);
    }

    public MealDTO updateMeal(Long id, MealRequest request) {
        Meal meal = mealRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Meal not found with id: " + id));

        meal.setName(request.getName());
        meal.setDescription(request.getDescription());
        meal.setMealType(request.getMealType());
        if (request.getMealDate() != null) meal.setMealDate(request.getMealDate());
        // Only update deadline if provided, otherwise keep existing
        if (request.getOrderDeadline() != null) {
            meal.setOrderDeadline(request.getOrderDeadline());
        }
        if (request.getCompatibleDiets() != null) meal.setCompatibleDiets(request.getCompatibleDiets());
        meal.setActive(true);

        return mapToDTO(mealRepository.save(meal));
    }

    public void deactivateMeal(Long id) {
        Meal meal = mealRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Meal not found with id: " + id));
        meal.setActive(false);
        mealRepository.save(meal);
    }

    public MealDTO reactivateMeal(Long id) {
        Meal meal = mealRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Meal not found with id: " + id));
        meal.setActive(true);
        // Set deadline to end of day if null or passed
        if (meal.getOrderDeadline() == null || meal.getOrderDeadline().isBefore(LocalTime.now())) {
            meal.setOrderDeadline(LocalTime.of(23, 59));
        }
        return mapToDTO(mealRepository.save(meal));
    }

    // ============ Statistics ============

    public Map<String, Object> getMealStatistics(MealType mealType, DietaryType dietaryType) {
        Map<String, Object> stats = new HashMap<>();
        long totalMeals  = mealRepository.count();
        long activeMeals = mealRepository.findByIsActiveTrueOrderByMealType().size();
        stats.put("totalMeals",    totalMeals);
        stats.put("activeMeals",   activeMeals);
        stats.put("inactiveMeals", totalMeals - activeMeals);
        if (mealType != null) {
            stats.put("mealsByType", Map.of(mealType.name(),
                    mealRepository.findByMealTypeAndIsActiveTrue(mealType).size()));
        }
        if (dietaryType != null) {
            stats.put("mealsByDietary", Map.of(dietaryType.name(),
                    mealRepository.findByDietaryCompatibility(dietaryType).size()));
        }
        return stats;
    }

    // ============ Patient Menu Methods ============

    /**
     * Returns all active meals for a given date that are compatible with the
     * patient's dietary type.
     *
     * FIX: We fetch ALL active meals for the date first (no deadline filter —
     * the deadline only affects orderable status shown in the UI, not visibility),
     * then filter in Java so we avoid Hibernate issues with nullable JPQL params.
     * The mapToDTO call sets active=false when the deadline has passed, so the
     * frontend still shows the meal as "Not Available" correctly.
     */
    public List<MealDTO> getAvailableMealsForPatient(LocalDate date, DietaryType patientDietaryType) {
        log.debug("Fetching meals for date={}, dietaryType={}", date, patientDietaryType);

        // Fetch all active meals for the date — no deadline cut here
        List<Meal> meals = mealRepository.findByMealDateAndIsActiveTrue(date);

        log.debug("Found {} active meals on {}", meals.size(), date);

        return meals.stream()
                // Dietary filter: show if no compatible diets set, or patient type matches
                .filter(m -> {
                    if (patientDietaryType == null) return true;
                    Set<DietaryType> diets = m.getCompatibleDiets();
                    return diets == null || diets.isEmpty() || diets.contains(patientDietaryType);
                })
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public List<MealDTO> getMealsForDateRange(LocalDate startDate, LocalDate endDate, DietaryType dietaryType) {
        return mealRepository.findAll().stream()
                .filter(m -> !m.getMealDate().isBefore(startDate) && !m.getMealDate().isAfter(endDate))
                .filter(Meal::isActive)
                .filter(m -> {
                    if (dietaryType == null) return true;
                    Set<DietaryType> diets = m.getCompatibleDiets();
                    return diets == null || diets.isEmpty() || diets.contains(dietaryType);
                })
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // ============ Orderable Check ============

    /**
     * A meal is orderable if it is active.
     * For today's meals: the current time must be before the deadline.
     * For future-dated meals (e.g. tomorrow): always orderable — the deadline
     * applies on the day itself, not the night before.
     * If no deadline is set, it is always orderable while active.
     */
    public boolean isMealOrderable(Meal meal) {
        if (!meal.isActive()) return false;
        LocalTime deadline = meal.getOrderDeadline();
        if (deadline == null) return true;

        LocalDate mealDate = meal.getMealDate();
        LocalDate today = LocalDate.now();

        if (mealDate != null && mealDate.isAfter(today)) return true;

        boolean before = deadline.isAfter(LocalTime.now());
        log.debug("Meal '{}' orderable={} (deadline={}, now={})",
                meal.getName(), before, deadline, LocalTime.now());
        return before;
    }

    // ============ Mapper ============

    /**
     * FIXED: Maps Meal entity to MealDTO with separate active and orderable fields
     * - active: The database isActive value (true/false)
     * - orderable: Computed value based on active AND deadline check
     */
    public MealDTO mapToDTO(Meal meal) {
        boolean isOrderable = isMealOrderable(meal);

        return MealDTO.builder()
                .id(meal.getId())
                .name(meal.getName())
                .description(meal.getDescription())
                .mealType(meal.getMealType())
                .mealDate(meal.getMealDate())
                .active(meal.isActive())           // ← Database value (isActive)
                .orderable(isOrderable)             // ← Computed value (isOrderable())
                .compatibleDiets(mapDietaryTypesToStrings(meal.getCompatibleDiets()))
                .orderDeadline(meal.getOrderDeadline())
                .dailyMenuId(meal.getDailyMenu() != null ? meal.getDailyMenu().getId() : null)
                .createdById(meal.getCreatedById())
                .createdByRole(meal.getCreatedByRole() != null ? meal.getCreatedByRole().name() : null)
                .build();
    }

    // ============ DEBUG/MAINTENANCE ============

    public int forceActivateAllMeals() {
        List<Meal> allMeals  = mealRepository.findAll();
        int updated          = 0;
        LocalTime future     = LocalTime.of(23, 59);

        for (Meal meal : allMeals) {
            boolean changed = false;
            if (!meal.isActive()) { meal.setActive(true); changed = true; }
            if (meal.getOrderDeadline() == null || meal.getOrderDeadline().isBefore(LocalTime.now())) {
                meal.setOrderDeadline(future); changed = true;
            }
            if (changed) { mealRepository.save(meal); updated++; }
        }

        log.info("Force activate complete: {} meals updated", updated);
        return updated;
    }
}