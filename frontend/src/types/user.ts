// src/types/user.ts

//  Role enum matching backend Role.java
export type Role = 'ADMIN' | 'STAFF' | 'KITCHEN_STAFF' | 'PATIENT' | string

//  DietaryType enum matching backend DietaryType.java
export type DietaryType =
    | 'NORMAL'
    | 'DIABETIC'
    | 'VEGAN'
    | 'VEGETARIAN'
    | 'LOW_SODIUM'
    | 'GLUTEN_FREE'
    | 'NUT_ALLERGY'
    | string

//  Patient interface matching backend Patient.java
export interface Patient {
    id: number
    wardNumber: string
    bedNumber: string
    nin: string
    name: string          // First name
    surname: string       // Last name
    fullName?: string     // Optional: "name surname" combined
    age?: number
    gender?: string
    dietaryType?: DietaryType
    dietaryRestrictions?: DietaryType[]  // Backend may send array
    phone?: string
    email?: string
    isActive: boolean
    createdAt?: string
    updatedAt?: string
}

// User interface for staff/admin (shared fields with Patient)
export interface User {
    surname: string;
    name: string;
    id?: number
    username?: string
    fullName?: string     // Backend sends this for staff/admin
    email?: string
    phone?: string
    department?: string
    role: Role
    isActive?: boolean
    isApproved?: boolean
    forcePasswordChange?: boolean
    createdAt?: string
    updatedAt?: string

    // Patient-specific fields (optional for non-patients)
    patientId?: number
    wardNumber?: string
    bedNumber?: string
    nin?: string
    dietaryType?: DietaryType
}

//  AuthResponse: what backend returns on login (includes token)
export interface AuthResponse extends User {
    token: string
    message?: string      // Optional welcome message from backend
}

//  Login request types
export interface LoginRequest {
    username: string
    password: string
}

export interface PatientLoginRequest {
    wardNumber: string
    bedNumber: string
    nin: string
}

//  Helper type guards
export const isPatient = (user: User | null): user is User & { wardNumber: string; bedNumber: string; nin: string } => {
    return !!user?.wardNumber && user.role === 'PATIENT'
}

export const isStaff = (user: User | null): boolean => {
    return user?.role === 'STAFF' || user?.role === 'KITCHEN_STAFF' || user?.role === 'ADMIN'
}

export const isAdmin = (user: User | null): boolean => {
    return user?.role === 'ADMIN'
}

//  Utility: combine name/surname into fullName if needed
export const getFullName = (user: User | null): string => {
    if (!user) return 'Unknown'
    if (user.fullName) return user.fullName
    if (user.name && user.surname) return `${user.name} ${user.surname}`
    if (user.name) return user.name
    if (user.username) return user.username
    return 'User'
}