// src/pages/admin/PatientManagement.tsx
import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import {FiPlus, FiEdit, FiSearch, FiUserX, FiX, FiSave, FiAlertCircle} from 'react-icons/fi'
import '../../styles/pages/admin/PatientManagement.css'

// ============ TypeScript Interfaces (Match Backend Patient DTO) ============

// Backend Patient fields
export interface Patient {
    id: number
    wardNumber: string
    bedNumber: string
    nin: string
    name: string
    surname: string
    fullName?: string
    age?: number
    gender?: string
    dietaryType: string
    dietaryRestrictions?: string[]
    phone?: string
    email?: string
    isActive: boolean
    createdAt?: string
    updatedAt?: string
}

export interface PatientFormData {
    wardNumber: string
    bedNumber: string
    nin: string
    name: string
    surname: string
    age?: number
    gender?: string
    dietaryType: string
    phone?: string
    email?: string
}

type ModalMode = 'create' | 'edit' | null

type NotificationType = 'success' | 'error' | 'info'

interface Notification {
    message: string
    type: NotificationType
}

// ============ Main Component ============
export default function PatientManagement() {
    const [patients, setPatients] = useState<Patient[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [modalMode, setModalMode] = useState<ModalMode>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [notification, setNotification] = useState<Notification | null>(null)
    const [formData, setFormData] = useState<PatientFormData>({
        wardNumber: '',
        bedNumber: '',
        nin: '',
        name: '',
        surname: '',
        age: undefined,
        gender: '',
        dietaryType: 'NORMAL',
        phone: '',
        email: '',
    })
    const [editingPatientId, setEditingPatientId] = useState<number | null>(null)

    // Show notification toast
    const showNotification = (message: string, type: NotificationType) => {
        setNotification({ message, type })
        setTimeout(() => setNotification(null), 4000)
    }

    //  Fetch patients from backend - GET /api/admin/patients
    const fetchPatients = async () => {
        try {
            setIsLoading(true)
            const response = await api.get<Patient[]>('/admin/patients')
            setPatients(response.data || [])
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch patients'
            // 403 is expected if user doesn't have ADMIN role
            if (err.response?.status === 403) {
                showNotification('Access denied: Admin role required', 'error')
            } else {
                showNotification(errorMessage, 'error')
            }
            console.error('Error fetching patients:', err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchPatients()
    }, [])

    // Filter patients based on search
    const filteredPatients = patients.filter(
        (p) =>
            p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.surname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.wardNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.bedNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.nin?.includes(searchTerm) ||
            p.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Handle form input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: name === 'age' ? (value ? parseInt(value, 10) : undefined) : value
        }))
    }

    // Open modal for creating new patient
    const handleCreateClick = () => {
        setModalMode('create')
        setEditingPatientId(null)
        setFormData({
            wardNumber: '',
            bedNumber: '',
            nin: '',
            name: '',
            surname: '',
            age: undefined,
            gender: '',
            dietaryType: 'NORMAL',
            phone: '',
            email: '',
        })
        setShowModal(true)
    }

    // Open modal for editing existing patient
    const handleEditClick = (patient: Patient) => {
        setModalMode('edit')
        setEditingPatientId(patient.id)
        setFormData({
            wardNumber: patient.wardNumber,
            bedNumber: patient.bedNumber,
            nin: patient.nin,
            name: patient.name,
            surname: patient.surname,
            age: patient.age,
            gender: patient.gender || '',
            dietaryType: patient.dietaryType,
            phone: patient.phone || '',
            email: patient.email || '',
        })
        setShowModal(true)
    }

    // Close modal
    const handleCloseModal = () => {
        setShowModal(false)
        setModalMode(null)
        setEditingPatientId(null)
    }

    //  Handle form submission (Create or Update) - POST/PUT /api/admin/patients
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            //  Prepare payload - send null/undefined for empty optional fields
            const payload = {
                ...formData,
                phone: formData.phone?.trim() || undefined,
                email: formData.email?.trim() || undefined,
            }

            if (modalMode === 'create') {
                //  POST /api/admin/patients
                await api.post<Patient>('/admin/patients', payload)
                showNotification('Patient registered successfully', 'success')
            } else if (modalMode === 'edit' && editingPatientId) {
                //  PUT /api/admin/patients/{id}
                await api.put<Patient>(`/admin/patients/${editingPatientId}`, payload)
                showNotification('Patient updated successfully', 'success')
            }

            await fetchPatients() // Refresh list
            handleCloseModal()

        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to save patient'

            //  Handle field-specific errors from backend validation
            const fieldErrors = err.response?.data?.fieldErrors
            if (fieldErrors && typeof fieldErrors === 'object') {
                // Could set field-level errors here for inline display
                console.warn('Field validation errors:', fieldErrors)
            }

            showNotification(errorMessage, 'error')
            console.error('Error saving patient:', err)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Handle discharge patient - POST /api/admin/patients/{id}/discharge
    const handleDischarge = async (id: number) => {
        if (!window.confirm('Are you sure you want to discharge this patient?')) {
            return
        }

        try {
            await api.post(`/admin/patients/${id}/discharge`)
            showNotification('Patient discharged successfully', 'info')
            await fetchPatients() // Refresh list to show updated status
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to discharge patient'
            showNotification(errorMessage, 'error')
            console.error('Error discharging patient:', err)
        }
    }

    return (
        <div className="patient-management">
            {/* Notification Toast */}
            {notification && (
                <div className={`notification-toast ${notification.type}`}>
                    {notification.type === 'error' && <FiAlertCircle />}
                    {notification.message}
                    <button className="notification-close" onClick={() => setNotification(null)} type="button">
                        <FiX />
                    </button>
                </div>
            )}

            <div className="page-header">
                <h1>Patient Management</h1>
                <button className="btn-primary" onClick={handleCreateClick} disabled={isLoading} type="button">
                    <FiPlus />
                    Register Patient
                </button>
            </div>

            <div className="search-bar">
                <FiSearch />
                <input
                    type="text"
                    placeholder="Search by name, ward, bed number, or NIN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button className="search-clear" onClick={() => setSearchTerm('')} type="button">
                        <FiX />
                    </button>
                )}
            </div>

            <div className="patients-table-container">
                <table className="patients-table">
                    <thead>
                    <tr>
                        <th>Name</th>
                        <th>Ward</th>
                        <th>Bed</th>
                        <th>NIN</th>
                        <th>Dietary Type</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {isLoading ? (
                        <tr>
                            <td colSpan={7} className="loading">
                                Loading patients...
                            </td>
                        </tr>
                    ) : filteredPatients.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="no-data">
                                {searchTerm ? 'No patients match your search' : 'No patients registered yet'}
                            </td>
                        </tr>
                    ) : (
                        filteredPatients.map((patient) => (
                            <tr key={patient.id} className={!patient.isActive ? 'discharged-row' : ''}>
                                <td>
                                    <div className="patient-name">
                                        {/*  Use fullName if available, else combine name + surname */}
                                        {patient.fullName || `${patient.name} ${patient.surname}`}
                                    </div>
                                </td>
                                <td>{patient.wardNumber}</td>
                                <td>{patient.bedNumber}</td>
                                <td>{patient.nin}</td>
                                <td>
                    <span className={`badge badge-${patient.dietaryType.toLowerCase()}`}>
                      {patient.dietaryType.replace('_', ' ')}
                    </span>
                                </td>
                                <td>
                    <span className={`status-badge ${patient.isActive ? 'active' : 'inactive'}`}>
                      {patient.isActive ? 'Active' : 'Discharged'}
                    </span>
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        <button
                                            className="btn-icon"
                                            title="Edit"
                                            onClick={() => handleEditClick(patient)}
                                            disabled={!patient.isActive}
                                            type="button"
                                        >
                                            <FiEdit />
                                        </button>
                                        <button
                                            className="btn-icon danger"
                                            title={patient.isActive ? "Discharge" : "Already discharged"}
                                            onClick={() => handleDischarge(patient.id)}
                                            disabled={!patient.isActive}
                                            type="button"
                                        >
                                            <FiUserX />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{modalMode === 'create' ? 'Register New Patient' : 'Edit Patient'}</h2>
                            <button className="modal-close" onClick={handleCloseModal} type="button">
                                <FiX />
                            </button>
                        </div>

                        <form className="patient-form" onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>First Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Surname *</label>
                                    <input
                                        type="text"
                                        name="surname"
                                        value={formData.surname}
                                        onChange={handleInputChange}
                                        required
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Age</label>
                                    <input
                                        type="number"
                                        name="age"
                                        value={formData.age || ''}
                                        onChange={handleInputChange}
                                        min="0"
                                        max="150"
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Gender</label>
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                    >
                                        <option value="">Select...</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                        <option value="Prefer not to say">Prefer not to say</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Ward Number *</label>
                                    <input
                                        type="text"
                                        name="wardNumber"
                                        value={formData.wardNumber}
                                        onChange={handleInputChange}
                                        required
                                        disabled={isSubmitting}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Bed Number *</label>
                                    <input
                                        type="text"
                                        name="bedNumber"
                                        value={formData.bedNumber}
                                        onChange={handleInputChange}
                                        required
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>NIN (National ID) *</label>
                                    <input
                                        type="text"
                                        name="nin"
                                        value={formData.nin}
                                        onChange={handleInputChange}
                                        required
                                        disabled={isSubmitting}
                                        pattern="^\d{8,16}$"  //  Optional: match backend validation
                                        title="Enter 8-16 digit National ID"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Dietary Type *</label>
                                    <select
                                        name="dietaryType"
                                        value={formData.dietaryType}
                                        onChange={handleInputChange}
                                        required
                                        disabled={isSubmitting}
                                    >
                                        <option value="NORMAL">Normal</option>
                                        <option value="DIABETIC">Diabetic</option>
                                        <option value="VEGAN">Vegan</option>
                                        <option value="VEGETARIAN">Vegetarian</option>
                                        <option value="LOW_SODIUM">Low Sodium</option>
                                        <option value="GLUTEN_FREE">Gluten Free</option>
                                        <option value="NUT_ALLERGY">Nut Allergy</option>
                                    </select>
                                </div>
                            </div>

                            {/* Optional fields that backend supports */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="+263 77 123 4567"
                                        disabled={isSubmitting}
                                        pattern="^\+?[0-9\s\-]{7,20}$"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="patient@hospital.com"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={handleCloseModal}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="spinner-small"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <FiSave />
                                            {modalMode === 'create' ? 'Register Patient' : 'Update Patient'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}