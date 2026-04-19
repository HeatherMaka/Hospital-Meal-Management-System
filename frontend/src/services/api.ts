// src/services/api.ts
/// <reference types="vite/client" />
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

//  Use environment variable with fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

//  Create axios instance with defaults
export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    //  Optional: timeout for slow requests
    timeout: 30000, // 30 seconds
})

// Request interceptor: add auth token
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('token')

        if (token && config.headers) {
            //  Ensure Authorization header is set correctly
            config.headers.Authorization = `Bearer ${token}`
        }

        // log requests in dev mode
        if (import.meta.env.DEV) {
            console.debug(` API Request: ${config.method?.toUpperCase()} ${config.url}`)
        }

        return config
    },
    (error: AxiosError) => {
        console.error('Request interceptor error:', error)
        return Promise.reject(error)
    }
)

//  Response interceptor: handle errors globally
api.interceptors.response.use(
    (response: AxiosResponse) => {
        //  Optional: log successful responses in dev mode
        if (import.meta.env.DEV && response.config.url?.includes('/api/')) {
            console.debug(` API Response: ${response.status} ${response.config.url}`)
        }
        return response
    },
    async (error: AxiosError) => {
        //  Handle 401 Unauthorized: token expired or invalid
        if (error.response?.status === 401) {
            console.warn(' Authentication failed - clearing stored credentials')

            // Clear auth data
            localStorage.removeItem('token')
            localStorage.removeItem('user')

            //  Only redirect if not already on login page
            if (!window.location.pathname.includes('/login')) {
                // Dispatch event for components to handle logout
                window.dispatchEvent(new Event('auth-logout'))
                // Optional: redirect after a short delay
                setTimeout(() => {
                    window.location.href = '/login'
                }, 100)
            }
        }

        //  Handle 403 Forbidden: insufficient permissions
        if (error.response?.status === 403) {
            console.warn('🚫 Access denied:', error.response?.data)
            // Optional: show permission error UI
        }

        //  Handle 404 Not Found - FIXED: use optional chaining on error.config
        if (error.response?.status === 404) {
            console.warn(' Resource not found:', error.config?.url)
        }

        //  Handle network errors (no response)
        if (!error.response) {
            console.error(' Network error - check connection or CORS:', error.message)
        }

        // Re-throw error for components to handle
        return Promise.reject(error)
    }
)

//  Optional: Helper to parse backend validation errors
export const parseBackendErrors = (error: AxiosError): Record<string, string> => {
    const errors: Record<string, string> = {}

    // Backend returns: { fieldErrors: { username: "Required", email: "Invalid" } }
    const data = error.response?.data as any
    if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
        for (const [field, message] of Object.entries(data.fieldErrors)) {
            if (typeof message === 'string') {
                errors[field] = message
            }
        }
    }

    return errors
}

//  Optional: Helper to get user-friendly error message
export const getErrorMessage = (error: AxiosError): string => {
    const data = error.response?.data as any

    // Backend error format: { message: "User not found", error: "Not Found" }
    if (data?.message) {
        return data.message
    }
    if (data?.error) {
        return data.error
    }

    // Fallback to HTTP status text
    if (error.response?.statusText) {
        return `Error ${error.response.status}: ${error.response.statusText}`
    }

    // Network error fallback
    return error.message || 'An unexpected error occurred'
}

export default api