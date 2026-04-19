export type MealType = 'BREAKFAST' | 'LUNCH' | 'SUPPER'

export type DietaryType =
    | 'NORMAL'
    | 'DIABETIC'
    | 'VEGAN'
    | 'VEGETARIAN'
    | 'LOW_SODIUM'
    | 'GLUTEN_FREE'
    | 'NUT_ALLERGY'

export interface Meal {
    id: number
    name: string
    description?: string
    mealType: MealType
    compatibleDiets: DietaryType[]
    isActive: boolean
}

export interface DailyMenu {
    id: number
    date: string
    meal: Meal
    isAvailable: boolean
    isOrderable: boolean
}

export interface MealRequest {
    name: string
    description?: string
    mealType: MealType
    compatibleDiets: DietaryType[]
}

export interface DailyMenuRequest {
    date: string
    mealId: number
    isAvailable?: boolean
}