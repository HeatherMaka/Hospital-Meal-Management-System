import { MealType } from './meal'

export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED'

export interface Order {
    id: number
    patientName?: string
    wardNumber?: string
    bedNumber?: string
    mealName: string
    mealType: MealType
    orderDate: string
    status: OrderStatus
    specialRequest?: string
    orderedAt: string
    updatedAt?: string
}

export interface OrderRequest {
    mealId?: number
    quantity?: number
    specialRequest?: string
}

export interface OrderStats {
    label: string
    count: number
}