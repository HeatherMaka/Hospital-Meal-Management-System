import { DietaryType } from '../types/meal'

/**
 * Get display name for dietary type
 */
export function getDietaryDisplayName(type: DietaryType): string {
    const displayNames: Record<DietaryType, string> = {
        NORMAL: 'Normal',
        DIABETIC: 'Diabetic',
        VEGAN: 'Vegan',
        VEGETARIAN: 'Vegetarian',
        LOW_SODIUM: 'Low Sodium',
        GLUTEN_FREE: 'Gluten Free',
        NUT_ALLERGY: 'Nut Allergy',
    }
    return displayNames[type] || type
}

/**
 * Get color for dietary type badge
 */
export function getDietaryBadgeColor(type: DietaryType): string {
    const colors: Record<DietaryType, string> = {
        NORMAL: 'default',
        DIABETIC: 'warning',
        VEGAN: 'success',
        VEGETARIAN: 'success',
        LOW_SODIUM: 'info',
        GLUTEN_FREE: 'info',
        NUT_ALLERGY: 'danger',
    }
    return colors[type] || 'default'
}

/**
 * Check if meal is compatible with patient's dietary type
 */
export function isMealCompatible(
    mealDiets: DietaryType[],
    patientDiet: DietaryType
): boolean {
    if (!mealDiets || mealDiets.length === 0) {
        return patientDiet === 'NORMAL'
    }
    return mealDiets.includes(patientDiet) || mealDiets.includes('NORMAL')
}