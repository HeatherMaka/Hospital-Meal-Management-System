// src/main/java/com/baccuisine/baccuisine_backend/service/DailyMenuService.java
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
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DailyMenuService {

    private final DailyMenuRepository dailyMenuRepository;
    private final MealRepository mealRepository;
    private final MealService mealService;

    /**
     * Add meals to the daily menu.
     *
     * The schema is BIDIRECTIONAL:
     *   meals.daily_menu_id  → FK to daily_menus  (Meal owns this column)
     *   daily_menus.meal_id  → FK to meals        (DailyMenu owns this column)
     *
     * Both FKs must be set and saved in the correct order:
     *   1. Save Meal first (no daily_menu_id yet — avoids circular FK issue)
     *   2. Save DailyMenu with meal_id pointing to the saved Meal
     *   3. Update Meal.dailyMenu to point back to the saved DailyMenu
     *   4. Save Meal again so daily_menu_id column is written
     */
    @Transactional
    public DailyMenuDTO addToDailyMenu(DailyMenuRequest request) {
        log.info("Adding meals to daily menu: date={}, mealType={}",
                request.getMenuDate(), request.getMealType());

        List<Meal> addedMeals = new ArrayList<>();

        for (DailyMenuRequest.MealItemRequest mealReq : request.getMeals()) {

            // ── Step 1: Save Meal without dailyMenu reference yet ──────────────
            Meal meal = Meal.builder()
                    .name(mealReq.getName())
                    .description(mealReq.getDescription())
                    .mealType(request.getMealType())
                    .mealDate(request.getMenuDate())
                    .compatibleDiets(mealReq.getCompatibleDiets() != null
                            ? new HashSet<>(mealReq.getCompatibleDiets())
                            : new HashSet<>(Set.of(DietaryType.NORMAL)))
                    .orderDeadline(mealReq.getOrderDeadline())  //  LocalTime, no conversion needed
                    .isActive(true)
                    .createdById(request.getCreatedById())
                    .createdByRole(Role.KITCHEN_STAFF)
                    // dailyMenu intentionally null here — set after DailyMenu is saved
                    .build();

            Meal savedMeal = mealRepository.save(meal);

            // ── Step 2: Save DailyMenu with meal_id pointing to the saved Meal ─
            DailyMenu dailyMenu = DailyMenu.builder()
                    .menuDate(request.getMenuDate())
                    .mealType(request.getMealType())
                    .meal(savedMeal)              // ← sets daily_menus.meal_id
                    .isActive(true)
                    .createdById(request.getCreatedById())
                    .build();

            DailyMenu savedDailyMenu = dailyMenuRepository.save(dailyMenu);

            // ── Step 3: Set back-reference on Meal and save again ──────────────
            savedMeal.setDailyMenu(savedDailyMenu);  // ← sets meals.daily_menu_id
            mealRepository.save(savedMeal);

            addedMeals.add(savedMeal);
        }

        log.info("Added {} meals to daily menu", addedMeals.size());

        return DailyMenuDTO.builder()
                .date(request.getMenuDate())
                .mealType(request.getMealType())
                .items(addedMeals.stream()
                        .map(mealService::mapToDTO)  //  Uses updated MealService mapping
                        .collect(Collectors.toList()))
                .build();
    }

    /**
     * Get all daily menus for a date grouped by mealType (for staff view).
     */
    public List<DailyMenuDTO> getDailyMenusByDate(LocalDate date) {
        log.debug("Fetching daily menus for date={}", date);

        List<DailyMenu> allMenusForDate = dailyMenuRepository
                .findByMenuDateAndIsActiveTrue(date);

        // Group by mealType, collect the Meal from each DailyMenu row
        Map<MealType, List<Meal>> groupedByType = allMenusForDate.stream()
                .filter(dm -> dm.getMeal() != null && dm.getMeal().isActive())
                .collect(Collectors.groupingBy(
                        DailyMenu::getMealType,
                        Collectors.mapping(DailyMenu::getMeal, Collectors.toList())
                ));

        return Arrays.stream(MealType.values())
                .filter(groupedByType::containsKey)
                .map(mealType -> DailyMenuDTO.builder()
                        .date(date)
                        .mealType(mealType)
                        .items(groupedByType.get(mealType).stream()
                                .map(mealService::mapToDTO)
                                .collect(Collectors.toList()))
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Get daily menu for a specific mealType on a date (for staff view).
     */
    public DailyMenuDTO getDailyMenuByDateAndType(LocalDate date, MealType mealType) {
        log.debug("Fetching daily menu for date={}, type={}", date, mealType);

        List<MealDTO> mealDTOs = dailyMenuRepository.findByMenuDateAndIsActiveTrue(date)
                .stream()
                .filter(dm -> dm.getMealType() == mealType)
                .filter(dm -> dm.getMeal() != null && dm.getMeal().isActive())
                .map(dm -> mealService.mapToDTO(dm.getMeal()))
                .collect(Collectors.toList());

        if (mealDTOs.isEmpty()) {
            log.warn("No meals found for {} on {}", mealType, date);
            throw new RuntimeException("No meals found for " + mealType + " on " + date);
        }

        return DailyMenuDTO.builder()
                .date(date)
                .mealType(mealType)
                .items(mealDTOs)
                .build();
    }

    /**
     * Deactivate a meal and its DailyMenu row (remove from today's menu).
     */
    @Transactional
    public void deactivateMeal(Long mealId) {
        log.info("Deactivating meal: id={}", mealId);

        Meal meal = mealRepository.findById(mealId)
                .orElseThrow(() -> new RuntimeException("Meal not found: " + mealId));

        if (meal.getCreatedByRole() != Role.KITCHEN_STAFF) {
            throw new SecurityException("Cannot modify this meal");
        }

        // Deactivate the Meal
        meal.setActive(false);
        mealRepository.save(meal);

        // Deactivate the DailyMenu row that owns this meal (via meal_id FK)
        if (meal.getDailyMenu() != null) {
            DailyMenu dm = meal.getDailyMenu();
            dm.setActive(false);
            dailyMenuRepository.save(dm);
        }

        log.info("Meal {} and its daily menu entry deactivated", mealId);
    }

    @Transactional
    public void updateMeal(Long mealId, DailyMenuRequest.MealUpdateRequest updateRequest) {
        log.info("Updating meal: id={}", mealId);

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
        log.info("Meal {} updated successfully", mealId);
    }

    /**
     * Get menu for a patient filtered by their dietary type.
     */
    public List<DailyMenuDTO> getDailyMenuForPatient(LocalDate date, DietaryType patientDietaryType) {
        log.debug("Fetching patient menu for date={}, dietaryType={}", date, patientDietaryType);

        List<MealDTO> allMeals = mealService.getAvailableMealsForPatient(date, patientDietaryType);

        Map<MealType, List<MealDTO>> groupedByType = allMeals.stream()
                .collect(Collectors.groupingBy(MealDTO::getMealType));

        List<DailyMenuDTO> result = new ArrayList<>();
        for (MealType mealType : MealType.values()) {
            List<MealDTO> mealsOfType = groupedByType.getOrDefault(mealType, List.of());
            if (!mealsOfType.isEmpty()) {
                result.add(DailyMenuDTO.builder()
                        .date(date)
                        .mealType(mealType)
                        .items(mealsOfType)
                        .build());
            }
        }
        return result;
    }

    public List<DailyMenuDTO> getMenuForDateRange(LocalDate startDate, LocalDate endDate) {
        log.debug("Fetching menu for date range: {} to {}", startDate, endDate);

        List<DailyMenuDTO> result = new ArrayList<>();
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            result.addAll(getDailyMenuForPatient(date, null));
        }
        return result;
    }
}