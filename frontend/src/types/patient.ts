export type DietaryType =
    | 'NORMAL'
    | 'DIABETIC'
    | 'VEGAN'
    | 'VEGETARIAN'
    | 'LOW_SODIUM'
    | 'GLUTEN_FREE'
    | 'NUT_ALLERGY'

export interface Patient {
    id: number
    wardNumber: string
    bedNumber: string
    nin: string
    name: string
    surname: string
    age?: number
    gender?: string
    dietaryType: DietaryType
    isActive: boolean
    admissionDate?: string
    createdAt?: string
    updatedAt?: string
}

export interface PatientRegisterRequest {
    wardNumber: string
    bedNumber: string
    nin: string
    name: string
    surname: string
    age?: number
    gender?: string
    dietaryType: DietaryType
}

export interface PatientUpdateRequest {
    wardNumber?: string
    bedNumber?: string
    name?: string
    surname?: string
    age?: number
    gender?: string
    dietaryType?: DietaryType
}

export interface PatientStats {
    totalPatients: number
    activePatients: number
    dischargedPatients: number
    patientsByWard: WardStats[]
    patientsByDietaryType: DietaryStats[]
}

export interface WardStats {
    wardNumber: string
    count: number
}

export interface DietaryStats {
    dietaryType: DietaryType
    count: number
}