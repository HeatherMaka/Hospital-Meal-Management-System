import api from './api'
import { Patient } from '../types/patient'

export interface PatientRegisterRequest {
    wardNumber: string
    bedNumber: string
    nin: string
    name: string
    surname: string
    age?: number
    gender?: string
    dietaryType: string
}

export const patientService = {
    async getAllPatients(): Promise<Patient[]> {
        const response = await api.get<Patient[]>('/admin/patients')
        return response.data
    },

    async getPatientById(id: number): Promise<Patient> {
        const response = await api.get<Patient>(`/admin/patients/${id}`)
        return response.data
    },

    async registerPatient(patient: PatientRegisterRequest): Promise<Patient> {
        const response = await api.post<Patient>('/admin/patients', patient)
        return response.data
    },

    async updatePatient(id: number, patient: PatientRegisterRequest): Promise<Patient> {
        const response = await api.put<Patient>(`/admin/patients/${id}`, patient)
        return response.data
    },

    async dischargePatient(id: number): Promise<void> {
        await api.post(`/admin/patients/${id}/discharge`)
    },

    async getPatientProfile(): Promise<Patient> {
        const response = await api.get<Patient>('/patient/profile')
        return response.data
    },
}