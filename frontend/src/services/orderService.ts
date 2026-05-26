import api from './api'
import { Order, OrderRequest, OrderStats } from '../types/order'

export const orderService = {
    async placeOrder(order: OrderRequest): Promise<Order> {
        const response = await api.post<Order>('/patient/orders', {
            mealId: order.mealId,
            quantity: order.quantity ?? 1,
            specialRequest: order.specialRequest,
        })
        return response.data
    },

    async placeSpecialRequest(specialRequest: string): Promise<Order> {
        const response = await api.post<Order>('/patient/orders', {
            specialRequest,
        })
        return response.data
    },

    async getPatientOrders(date?: string): Promise<Order[]> {
        const url = date
            ? `/patient/orders?date=${date}`
            : '/patient/orders'
        const response = await api.get<Order[]>(url)
        return response.data
    },

    async getKitchenOrders(date: string, mealType: string): Promise<Order[]> {
        const response = await api.get<Order[]>(`/staff/orders?date=${date}&mealType=${mealType}`)
        return response.data
    },

    async updateOrderStatus(id: number, status: string): Promise<Order> {
        const response = await api.patch<Order>(`/staff/orders/${id}/status?status=${status}`)
        return response.data
    },

    async getSpecialRequests(date: string): Promise<Order[]> {
        const response = await api.get<Order[]>(`/staff/orders/special-requests?date=${date}`)
        return response.data
    },

    async getAnalytics(date?: string): Promise<OrderStats[]> {
        const url = date
            ? `/staff/analytics?date=${date}`
            : '/staff/analytics'
        const response = await api.get<OrderStats[]>(url)
        return response.data
    },
}