import api from './api'
import { Meal, MealRequest, DailyMenu, DailyMenuRequest } from '../types/meal'

export const mealService = {
    async getAllMeals(): Promise<Meal[]> {
        const response = await api.get<Meal[]>('/meals')
        return response.data
    },

    async getMealById(id: number): Promise<Meal> {
        const response = await api.get<Meal>(`/meals/${id}`)
        return response.data
    },

    async getMealsByType(mealType: string): Promise<Meal[]> {
        const response = await api.get<Meal[]>(`/meals/type/${mealType}`)
        return response.data
    },

    async getMealsByDietaryType(dietaryType: string): Promise<Meal[]> {
        const response = await api.get<Meal[]>(`/meals/dietary/${dietaryType}`)
        return response.data
    },

    async createMeal(meal: MealRequest): Promise<Meal> {
        const response = await api.post<Meal>('/meals', meal)
        return response.data
    },

    async updateMeal(id: number, meal: MealRequest): Promise<Meal> {
        const response = await api.put<Meal>(`/meals/${id}`, meal)
        return response.data
    },

    async deactivateMeal(id: number): Promise<void> {
        await api.delete(`/meals/${id}`)
    },

    async getDailyMenu(date: string): Promise<DailyMenu[]> {
        const response = await api.get<DailyMenu[]>(`/staff/menu?date=${date}`)
        return response.data
    },

    async addToDailyMenu(menu: DailyMenuRequest): Promise<DailyMenu> {
        const response = await api.post<DailyMenu>('/staff/menu', menu)
        return response.data
    },
}