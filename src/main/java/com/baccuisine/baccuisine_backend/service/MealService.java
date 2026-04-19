package com.baccuisine.baccuisine_backend.service;

import com.baccuisine.baccuisine_backend.dto.request.MealRequest;
import com.baccuisine.baccuisine_backend.dto.response.MealDTO;
import com.baccuisine.baccuisine_backend.enums.DietaryType;
import com.baccuisine.baccuisine_backend.enums.MealType;
import com.baccuisine.baccuisine_backend.enums.Role;
import com.baccuisine.baccuisine_backend.model.Meal;
import com.baccuisine.baccuisine_backend.repository.MealRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MealService {

    private final MealRepository mealRepository;

    public MealDTO createMeal(MealRequest request) {
        Meal meal = Meal.builder()
                .name(request.getName())
                .description(request.getDescription())
                .mealType(request.getMealType())
                .compatibleDiets(request.getCompatibleDiets())
                .isActive(true)
                .build();
        return mapToDTO(mealRepository.save(meal));
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
        if (request.getCompatibleDiets() != null) {
            meal.setCompatibleDiets(request.getCompatibleDiets());
        }
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
        return mapToDTO(mealRepository.save(meal));
    }

    public java.util.Map<String, Object> getMealStatistics(MealType mealType, DietaryType dietaryType) {
        java.util.Map<String, Object> stats = new java.util.HashMap<>();
        long totalMeals = mealRepository.count();
        long activeMeals = mealRepository.findByIsActiveTrueOrderByMealType().size();
        stats.put("totalMeals", totalMeals);
        stats.put("activeMeals", activeMeals);
        stats.put("inactiveMeals", totalMeals - activeMeals);
        if (mealType != null) {
            long typeCount = mealRepository.findByMealTypeAndIsActiveTrue(mealType).size();
            stats.put("mealsByType", java.util.Map.of(mealType.name(), typeCount));
        }
        if (dietaryType != null) {
            long dietaryCount = mealRepository.findByDietaryCompatibility(dietaryType).size();
            stats.put("mealsByDietary", java.util.Map.of(dietaryType.name(), dietaryCount));
        }
        return stats;
    }

    // ============ Patient Menu Methods ============

    public List<MealDTO> getAvailableMealsForPatient(LocalDate date, DietaryType patientDietaryType) {
        LocalTime now = LocalTime.now();

        List<Meal> availableMeals = mealRepository.findAvailableMealsForPatient(
                date,
                Role.KITCHEN_STAFF,
                now,
                patientDietaryType
        );

        return availableMeals.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public boolean isMealOrderable(Meal meal) {
        if (!meal.isActive()) return false;
        if (meal.getOrderDeadline() == null) return true;
        return meal.getOrderDeadline().isAfter(LocalTime.now());
    }

    public List<MealDTO> getMealsForDateRange(LocalDate startDate, LocalDate endDate, DietaryType dietaryType) {
        return mealRepository.findAll().stream()
                .filter(m -> !m.getMealDate().isBefore(startDate) && !m.getMealDate().isAfter(endDate))
                .filter(Meal::isActive)
                .filter(m -> m.getCreatedByRole() == Role.KITCHEN_STAFF)
                .filter(m -> dietaryType == null || m.getCompatibleDiets().contains(dietaryType))
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // ============ Mapper ============

    public MealDTO mapToDTO(Meal meal) {
        return MealDTO.builder()
                .id(meal.getId())
                .name(meal.getName())
                .description(meal.getDescription())
                .mealType(meal.getMealType())
                .mealDate(meal.getMealDate())
                .orderDeadline(meal.getOrderDeadline())
                .compatibleDiets(meal.getCompatibleDiets())
                .isActive(meal.isActive())
                .createdById(meal.getCreatedById())
                .createdByRole(meal.getCreatedByRole() != null ? meal.getCreatedByRole().name() : null)
                .build();
    }
}