package com.baccuisine.baccuisine_backend.service;

import com.baccuisine.baccuisine_backend.dto.request.DailyMenuRequest;
import com.baccuisine.baccuisine_backend.dto.response.DailyMenuDTO;
import com.baccuisine.baccuisine_backend.dto.response.MealDTO;
import com.baccuisine.baccuisine_backend.enums.DietaryType;
import com.baccuisine.baccuisine_backend.enums.MealType;
import com.baccuisine.baccuisine_backend.enums.Role;
import com.baccuisine.baccuisine_backend.model.DailyMenu;
import com.baccuisine.baccuisine_backend.model.Meal;
import com.baccuisine.baccuisine_backend.repository.DailyMenuRepository;
import com.baccuisine.baccuisine_backend.repository.MealRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DailyMenuService {

    private final DailyMenuRepository dailyMenuRepository;
    private final MealRepository mealRepository;
    private final MealService mealService;

    @Transactional
    public DailyMenuDTO addToDailyMenu(DailyMenuRequest request) {
        DailyMenu dailyMenu = dailyMenuRepository
                .findByMenuDateAndMealType(request.getMenuDate(), request.getMealType())
                .orElseGet(() -> {
                    DailyMenu newMenu = DailyMenu.builder()
                            .menuDate(request.getMenuDate())
                            .mealType(request.getMealType())
                            .isActive(true)
                            .createdById(request.getCreatedById())
                            .build();
                    return dailyMenuRepository.save(newMenu);
                });

        List<Meal> addedMeals = new ArrayList<>();
        for (DailyMenuRequest.MealItemRequest mealReq : request.getMeals()) {
            Meal meal = Meal.builder()
                    .name(mealReq.getName())
                    .description(mealReq.getDescription())
                    .mealType(request.getMealType())
                    .mealDate(request.getMenuDate())
                    .compatibleDiets(mealReq.getCompatibleDiets() != null
                            ? new HashSet<>(mealReq.getCompatibleDiets())
                            : Set.of(DietaryType.NORMAL))
                    .orderDeadline(mealReq.getOrderDeadline())
                    .isActive(true)
                    .createdById(request.getCreatedById())
                    .createdByRole(Role.KITCHEN_STAFF)
                    .build();
            addedMeals.add(mealRepository.save(meal));
            dailyMenu.addMeal(meal);
        }

        dailyMenuRepository.save(dailyMenu);
        return mapToDTO(dailyMenu, addedMeals);
    }

    public List<DailyMenuDTO> getDailyMenusByDate(LocalDate date) {
        return Arrays.stream(MealType.values())
                .map(mealType -> {
                    try {
                        return getDailyMenuByDateAndType(date, mealType);
                    } catch (RuntimeException e) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    public DailyMenuDTO getDailyMenuByDateAndType(LocalDate date, MealType mealType) {
        DailyMenu dailyMenu = dailyMenuRepository
                .findByMenuDateAndMealType(date, mealType)
                .orElseThrow(() -> new RuntimeException("Daily menu not found for " + date + " " + mealType));

        List<Meal> meals = mealRepository
                .findByMealDateAndMealTypeAndIsActiveTrue(date, mealType);

        return mapToDTO(dailyMenu, meals);
    }

    @Transactional
    public void deactivateMeal(Long mealId) {
        Meal meal = mealRepository.findById(mealId)
                .orElseThrow(() -> new RuntimeException("Meal not found: " + mealId));

        if (meal.getCreatedByRole() != Role.KITCHEN_STAFF) {
            throw new SecurityException("Cannot modify this meal");
        }

        meal.setActive(false);
        mealRepository.save(meal);
    }

    @Transactional
    public void updateMeal(Long mealId, DailyMenuRequest.MealUpdateRequest updateRequest) {
        Meal meal = mealRepository.findById(mealId)
                .orElseThrow(() -> new RuntimeException("Meal not found: " + mealId));

        if (meal.getCreatedByRole() != Role.KITCHEN_STAFF) {
            throw new SecurityException("Cannot modify this meal");
        }

        if (updateRequest.getName() != null) meal.setName(updateRequest.getName());
        if (updateRequest.getDescription() != null) meal.setDescription(updateRequest.getDescription());
        if (updateRequest.getCompatibleDiets() != null) {
            meal.setCompatibleDiets(new HashSet<>(updateRequest.getCompatibleDiets()));
        }
        if (updateRequest.getOrderDeadline() != null) {
            meal.setOrderDeadline(updateRequest.getOrderDeadline());
        }

        mealRepository.save(meal);
    }

    public List<DailyMenuDTO> getDailyMenuForPatient(LocalDate date, DietaryType patientDietaryType) {
        List<MealDTO> allMeals = mealService.getAvailableMealsForPatient(date, patientDietaryType);

        Map<MealType, List<MealDTO>> groupedByType = allMeals.stream()
                .collect(Collectors.groupingBy(MealDTO::getMealType));

        List<DailyMenuDTO> dailyMenus = new ArrayList<>();

        for (MealType mealType : MealType.values()) {
            List<MealDTO> mealsOfType = groupedByType.getOrDefault(mealType, List.of());
            if (!mealsOfType.isEmpty()) {
                dailyMenus.add(DailyMenuDTO.builder()
                        .date(date)
                        .mealType(mealType)
                        .items(mealsOfType)
                        .build());
            }
        }
        return dailyMenus;
    }

    public List<DailyMenuDTO> getMenuForDateRange(LocalDate startDate, LocalDate endDate) {
        List<DailyMenuDTO> result = new ArrayList<>();
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            result.addAll(getDailyMenuForPatient(date, null));
        }
        return result;
    }

    private DailyMenuDTO mapToDTO(DailyMenu dailyMenu, List<Meal> meals) {
        List<MealDTO> mealDTOs = meals.stream()
                .map(mealService::mapToDTO)
                .collect(Collectors.toList());

        return DailyMenuDTO.builder()
                .date(dailyMenu.getMenuDate())
                .mealType(dailyMenu.getMealType())
                .items(mealDTOs)
                .build();
    }
}