// src/services/authService.ts
import { api } from './api'  //  Named import to match api.ts export
import { AuthResponse, User } from '../types/user'

//  Base paths for auth endpoints (match backend @RequestMapping)
const AUTH_BASE = '/auth'
const PATIENT_AUTH_BASE = '/auth/patient'

export const authService = {
    /**
     *  Staff/Admin login: POST /api/auth/login
     * Backend expects: { username, password }
     * Returns: AuthResponse with token + user data
     */
    login: async (username: string, password: string): Promise<AuthResponse> => {
        const response = await api.post<AuthResponse>(`${AUTH_BASE}/login`, {
            username,
            password,
        })
        return response.data
    },


    patientLogin: async (
        wardNumber: string,
        bedNumber: string,
        nin: string
    ): Promise<AuthResponse> => {
        const response = await api.post<AuthResponse>(`${PATIENT_AUTH_BASE}/login`, {
            wardNumber,
            bedNumber,
            nin,
        })
        return response.data
    },

    /**
     *  Optional: Register new staff (admin only)
     * Backend: POST /api/auth/staff/register
     */
    registerStaff: async (staffData: {
        username: string
        password: string
        fullName: string
        phone?: string
        email?: string
        department: string
        role: string
    }): Promise<User> => {
        const response = await api.post<User>(`${AUTH_BASE}/staff/register`, staffData)
        return response.data
    },

    /**
     *  Get current user profile
     * Backend: GET /api/auth/me (if implemented) or use stored user
     */
    getCurrentUser: async (): Promise<User> => {
        const response = await api.get<User>(`${AUTH_BASE}/me`)
        return response.data
    },

    /**
     * Optional: Refresh token endpoint (if backend supports it)
     */
    refreshToken: async (): Promise<AuthResponse> => {
        const response = await api.post<AuthResponse>(`${AUTH_BASE}/refresh`)
        return response.data
    },
}