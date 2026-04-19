// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react'
import { authService } from '../services/authService'
import { User } from '../types/user'

interface AuthContextType {
    user: User | null
    login: (username: string, password: string) => Promise<void>
    patientLogin: (wardNumber: string, bedNumber: string, nin: string) => Promise<void>
    logout: () => void
    isLoading: boolean
    error: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let isMounted = true

        // Check for existing token on mount
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')

        if (token && userData) {
            try {
                const parsedUser = JSON.parse(userData)
                if (isMounted) {
                    setUser(parsedUser)
                }
            } catch (e) {
                // Clear corrupted data
                localStorage.removeItem('token')
                localStorage.removeItem('user')
            }
        }

        if (isMounted) {
            setIsLoading(false)
        }

        // Cleanup to prevent state updates on unmounted component
        return () => { isMounted = false }
    }, []) //  Empty deps = run once on mount

    const login = async (username: string, password: string) => {
        try {
            setError(null)
            const response = await authService.login(username, password)

            localStorage.setItem('token', response.token)
            localStorage.setItem('user', JSON.stringify(response))
            setUser(response)
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed')
            throw err
        }
    }

    const patientLogin = async (wardNumber: string, bedNumber: string, nin: string) => {
        try {
            setError(null)
            const response = await authService.patientLogin(wardNumber, bedNumber, nin)

            localStorage.setItem('token', response.token)
            localStorage.setItem('user', JSON.stringify(response))
            setUser(response)
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed')
            throw err
        }
    }

    const logout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
        setError(null)
    }

    //  CRITICAL FIX: Memoize context value to prevent unnecessary re-renders
    // This stops the infinite loop caused by context value changing on every render
    const contextValue = useMemo(() => ({
        user,
        login,
        patientLogin,
        logout,
        isLoading,
        error,
    }), [user, isLoading, error]) //  Only re-create when these actually change

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}