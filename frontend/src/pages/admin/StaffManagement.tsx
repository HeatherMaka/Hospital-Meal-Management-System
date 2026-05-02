// src/pages/admin/StaffManagement.tsx
import { useState, useEffect, FormEvent, ChangeEvent } from 'react'
import { api } from '../../services/api'  //  Use shared axios instance
import {
    FiPlus, FiEdit2, FiRefreshCw,
    FiKey, FiUser, FiPhone, FiMail, FiBriefcase,
    FiCheckCircle, FiXCircle, FiAlertCircle, FiX
} from 'react-icons/fi'
import '../../styles/pages/admin/StaffManagement.css'

// ============ TypeScript Interfaces (Match Backend User/StaffResponse DTOs) ============

// Backend User/StaffResponse fields
export interface Staff {
    id: number
    username: string
    fullName: string
    email?: string | null
    phone?: string | null
    department?: string | null
    role: 'STAFF' | 'KITCHEN_STAFF' | 'NUTRITIONIST' | 'ADMIN' | string
    active: boolean            //  Backend field name (not isActive)
    forcePasswordChange?: boolean
    createdAt: string          // ISO datetime
    updatedAt?: string
}

export interface RegisterStaffForm {
    username: string
    password: string
    fullName: string
    phone?: string | null      //  Allow null for backend compatibility
    email?: string | null
    department?: string | null
    role: string
}

type NotificationType = 'success' | 'error' | 'info'

interface Notification {
    message: string
    type: NotificationType
}

// Field errors state for form validation display
interface FieldErrors {
    username?: string
    password?: string
    fullName?: string
    phone?: string
    email?: string
    department?: string
    role?: string
}

// ============ Main Component ============
export default function StaffManagement() {
    // State
    const [staffList, setStaffList] = useState<Staff[]>([])
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
    const [showRegisterForm, setShowRegisterForm] = useState<boolean>(false)
    const [notification, setNotification] = useState<Notification | null>(null)

    // Field-level errors for inline validation feedback
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

    // Form state - Use null for optional fields to match backend
    const [formData, setFormData] = useState<RegisterStaffForm>({
        username: '',
        password: '',
        fullName: '',
        phone: null,
        email: null,
        department: null,
        role: 'STAFF'
    })

    // Fetch all active staff - GET /api/admin/staff
    const fetchStaff = async (): Promise<void> => {
        try {
            setIsLoading(true)
            const response = await api.get<Staff[]>('/admin/staff')
            setStaffList(response.data || [])
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch staff'
            showNotification(errorMessage, 'error')
            console.error('Error fetching staff:', err)
            setStaffList([])
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchStaff()
    }, [])

    // Notification helper
    const showNotification = (message: string, type: NotificationType): void => {
        setNotification({ message, type })
        setTimeout(() => setNotification(null), 4000)
    }

    // Clear field errors when user starts typing
    const clearFieldError = (fieldName: keyof FieldErrors): void => {
        setFieldErrors(prev => ({ ...prev, [fieldName]: undefined }))
    }

    // Form handlers
    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        clearFieldError(name as keyof FieldErrors)
    }

    const resetForm = (): void => {
        setFormData({
            username: '',
            password: '',
            fullName: '',
            phone: null,      // Use null for optional fields
            email: null,
            department: null,
            role: 'STAFF'
        })
        setFieldErrors({})
        setEditingStaff(null)
        setShowRegisterForm(false)
    }

    //  Phone validation regex matching backend: ^\+?[0-9\s\-]{7,20}$
    const isValidPhone = (phone: string | null | undefined): boolean => {
        if (!phone) return true  //  Empty/null is valid (backend allows it)
        const trimmed = phone.trim()
        if (!trimmed) return true
        return /^\+?[0-9\s\-]{7,20}$/.test(trimmed)
    }

    //  Comprehensive form validation matching backend rules
    const validateForm = (): boolean => {
        const errors: FieldErrors = {}
        let isValid = true

        // Username: required, 3-50 chars
        if (!formData.username.trim()) {
            errors.username = 'Username is required'
            isValid = false
        } else if (formData.username.length < 3 || formData.username.length > 50) {
            errors.username = 'Username must be 3-50 characters'
            isValid = false
        }

        // Password: required for new, min 6 chars
        if (!editingStaff) {
            if (!formData.password) {
                errors.password = 'Password is required'
                isValid = false
            } else if (formData.password.length < 6) {
                errors.password = 'Password must be at least 6 characters'
                isValid = false
            }
        }

        // Full Name: required
        if (!formData.fullName.trim()) {
            errors.fullName = 'Full name is required'
            isValid = false
        }

        //  Phone: optional, but if provided must match backend pattern
        if (formData.phone && !isValidPhone(formData.phone)) {
            errors.phone = 'Invalid phone format. Use: +263771234567 or 077 123 4567'
            isValid = false
        }

        //  Email: optional, but if provided must be valid format
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Invalid email format'
            isValid = false
        }

        //  Department: required - FIX TS18048 with optional chaining
        if (!formData.department?.trim()) {
            errors.department = 'Department is required'
            isValid = false
        }

        // Role: required
        if (!formData.role) {
            errors.role = 'Please select a role'
            isValid = false
        }

        setFieldErrors(errors)

        // Show first error as notification for immediate feedback
        if (!isValid) {
            const errorValues = Object.values(errors).filter((v): v is string => typeof v === 'string')
            if (errorValues.length > 0) {
                showNotification(errorValues[0], 'error')
            }
        }

        return isValid
    }

    //  Register new staff or update existing - POST/PUT /api/admin/staff/register or /api/admin/staff/{id}
    const handleRegister = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        setIsSubmitting(true)
        try {
            //  Prepare payload - send null for empty optional fields (backend expects null, not empty string)
            const payload = {
                username: formData.username.trim(),
                password: formData.password,
                fullName: formData.fullName.trim(),
                phone: formData.phone?.trim() || null,  //  Safe null handling
                email: formData.email?.trim() || null,
                department: formData.department?.trim() || null,  //  FIX TS18048 here
                role: formData.role,
            }

            if (editingStaff) {
                // Update existing staff: PUT /api/admin/staff/{id}
                await api.put<Staff>(`/admin/staff/${editingStaff.id}`, payload)
            } else {
                // Register new staff: POST /api/admin/staff/register
                await api.post<Staff>('/admin/staff/register', payload)
            }

            showNotification(
                editingStaff
                    ? `${formData.fullName} updated successfully`
                    : `${formData.fullName} registered successfully!`,
                'success'
            )
            resetForm()
            await fetchStaff()

        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Operation failed'

            //  Handle field-specific errors from backend validation
            const fieldErrors = err.response?.data?.fieldErrors
            if (fieldErrors && typeof fieldErrors === 'object') {
                setFieldErrors(prev => ({ ...prev, ...fieldErrors }))
            } else if (errorMessage.includes('username')) {
                setFieldErrors(prev => ({ ...prev, username: errorMessage }))
            } else if (errorMessage.includes('phone')) {
                setFieldErrors(prev => ({ ...prev, phone: errorMessage }))
            } else if (errorMessage.includes('email')) {
                setFieldErrors(prev => ({ ...prev, email: errorMessage }))
            } else if (errorMessage.includes('department')) {
                setFieldErrors(prev => ({ ...prev, department: errorMessage }))
            }

            showNotification(errorMessage, 'error')
            console.error('Error:', err)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Start editing staff
    const handleEdit = (staff: Staff): void => {
        setEditingStaff(staff)
        setFormData({
            username: staff.username,
            password: '',  // Never pre-fill password
            fullName: staff.fullName,
            phone: staff.phone ?? null,  //  Ensure null, not undefined
            email: staff.email ?? null,
            department: staff.department ?? null,
            role: staff.role
        })
        setFieldErrors({})
        setShowRegisterForm(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    //  Reset staff password - PATCH /api/admin/staff/{id}/reset-password
    const handleResetPassword = async (staff: Staff): Promise<void> => {
        const newPassword = window.prompt(`Enter new password for ${staff.fullName}:`)
        if (!newPassword || newPassword.length < 6) {
            showNotification('Password must be at least 6 characters', 'error')
            return
        }

        if (!window.confirm(`Reset password for ${staff.fullName}? They will be required to change it on next login.`)) {
            return
        }

        try {
            await api.patch(`/admin/staff/${staff.id}/reset-password`, { newPassword })
            showNotification(`Password reset for ${staff.fullName}`, 'success')
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to reset password'
            showNotification(errorMessage, 'error')
        }
    }

    //  Toggle staff active status - POST /api/admin/staff/{id}/deactivate or /reactivate
    const handleToggleActive = async (staff: Staff): Promise<void> => {
        const action = staff.active ? 'deactivate' : 'reactivate'
        const confirmMsg = staff.active
            ? `Deactivate ${staff.fullName}? They won't be able to login.`
            : `Reactivate ${staff.fullName}?`

        if (!window.confirm(confirmMsg)) return

        try {
            await api.post(`/admin/staff/${staff.id}/${action}`)
            showNotification(
                `${staff.fullName} ${staff.active ? 'deactivated' : 'reactivated'}`,
                'info'
            )
            await fetchStaff()
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || `Failed to ${action} staff`
            showNotification(errorMessage, 'error')
        }
    }

    // Refresh handler
    const handleRefresh = (): void => {
        fetchStaff()
        showNotification('Refreshing staff list...', 'info')
    }

    // Format date for display
    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        })
    }

    // Get role badge CSS class
    const getRoleBadgeClass = (role: string): string => {
        const colors: Record<string, string> = {
            'ADMIN': 'badge-admin',
            'STAFF': 'badge-staff',
            'KITCHEN_STAFF': 'badge-kitchen',
            'NUTRITIONIST': 'badge-nutritionist'
        }
        return colors[role] || 'badge-default'
    }

    return (
        <div className="staff-management">
            {/* Notification Toast */}
            {notification && (
                <div className={`notification-toast ${notification.type}`}>
                    {notification.type === 'error' && <FiAlertCircle />}
                    {notification.type === 'success' && <FiCheckCircle />}
                    {notification.message}
                    <button className="notification-close" onClick={() => setNotification(null)} type="button">
                        <FiX />
                    </button>
                </div>
            )}

            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1>Staff Management</h1>
                    <p className="page-subtitle">Register and manage kitchen staff accounts</p>
                </div>
                <div className="header-actions">
                    <button
                        className="btn-primary"
                        onClick={() => {
                            resetForm()
                            setShowRegisterForm(!showRegisterForm)
                        }}
                        type="button"
                    >
                        <FiPlus /> {showRegisterForm ? 'Cancel' : 'Register New Staff'}
                    </button>
                    <button className="btn-refresh" onClick={handleRefresh} disabled={isLoading} type="button">
                        <FiRefreshCw className={isLoading ? 'spinning' : ''} />
                    </button>
                </div>
            </div>

            {/* Registration/Edit Form */}
            {showRegisterForm && (
                <div className="registration-card">
                    <h2>{editingStaff ? 'Edit Staff' : 'Register New Staff'}</h2>
                    <form onSubmit={handleRegister} className="staff-form" noValidate>
                        <div className="form-grid">
                            {/* Username */}
                            <div className={`form-group ${fieldErrors.username ? 'has-error' : ''}`}>
                                <label>
                                    <FiUser /> Username *
                                </label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    placeholder="e.g., kitchen01"
                                    required
                                    disabled={!!editingStaff}
                                    className={fieldErrors.username ? 'input-error' : ''}
                                />
                                {fieldErrors.username && (
                                    <small className="error-message">{fieldErrors.username}</small>
                                )}
                            </div>

                            {/* Password */}
                            <div className={`form-group ${fieldErrors.password ? 'has-error' : ''}`}>
                                <label>
                                    <FiKey /> Password {editingStaff ? '(optional)' : '*'}
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder={editingStaff ? "Leave blank to keep current" : "Min. 6 characters"}
                                    required={!editingStaff}
                                    minLength={6}
                                    className={fieldErrors.password ? 'input-error' : ''}
                                />
                                {fieldErrors.password && (
                                    <small className="error-message">{fieldErrors.password}</small>
                                )}
                                {editingStaff && !fieldErrors.password && (
                                    <small className="form-hint">Leave blank to keep current password</small>
                                )}
                            </div>

                            {/* Full Name */}
                            <div className={`form-group ${fieldErrors.fullName ? 'has-error' : ''}`}>
                                <label>Full Name *</label>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                    placeholder=""
                                    required
                                    className={fieldErrors.fullName ? 'input-error' : ''}
                                />
                                {fieldErrors.fullName && (
                                    <small className="error-message">{fieldErrors.fullName}</small>
                                )}
                            </div>

                            {/* Phone - Backend-matching validation */}
                            <div className={`form-group ${fieldErrors.phone ? 'has-error' : ''}`}>
                                <label><FiPhone /> Phone</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone ?? ''}  //  Handle null for input value
                                    onChange={handleInputChange}
                                    placeholder="+263 77 123 4567 or leave empty"
                                    className={fieldErrors.phone ? 'input-error' : ''}
                                />
                                {fieldErrors.phone ? (
                                    <small className="error-message">{fieldErrors.phone}</small>
                                ) : (
                                    <small className="form-hint">Optional. Format: +263771234567</small>
                                )}
                            </div>

                            {/* Email */}
                            <div className={`form-group ${fieldErrors.email ? 'has-error' : ''}`}>
                                <label><FiMail /> Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email ?? ''}  //  Handle null for input value
                                    onChange={handleInputChange}
                                    placeholder="staff@hospital.com"
                                    className={fieldErrors.email ? 'input-error' : ''}
                                />
                                {fieldErrors.email && (
                                    <small className="error-message">{fieldErrors.email}</small>
                                )}
                            </div>

                            {/* Department -  FIX TS18048 with null handling */}
                            <div className={`form-group ${fieldErrors.department ? 'has-error' : ''}`}>
                                <label><FiBriefcase /> Department *</label>
                                <input
                                    type="text"
                                    name="department"
                                    value={formData.department ?? ''}  //  Handle null for input value
                                    onChange={handleInputChange}
                                    placeholder="Kitchen, Nursing, etc."
                                    required
                                    className={fieldErrors.department ? 'input-error' : ''}
                                />
                                {fieldErrors.department && (
                                    <small className="error-message">{fieldErrors.department}</small>
                                )}
                            </div>

                            {/* Role */}
                            <div className={`form-group ${fieldErrors.role ? 'has-error' : ''}`}>
                                <label>Role *</label>
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleInputChange}
                                    required
                                    className={fieldErrors.role ? 'input-error' : ''}
                                >
                                    <option value="">Select a role</option>
                                    <option value="STAFF">Staff</option>
                                    <option value="KITCHEN_STAFF">Kitchen Staff</option>
                                    <option value="NUTRITIONIST">Nutritionist</option>
                                </select>
                                {fieldErrors.role && (
                                    <small className="error-message">{fieldErrors.role}</small>
                                )}
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn-secondary" onClick={resetForm}>
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
                                    editingStaff ? 'Update Staff' : 'Register Staff'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Staff List Section */}
            <div className="staff-list-section">
                <div className="section-header">
                    <h2>Staff Members ({staffList.length})</h2>
                </div>

                {isLoading ? (
                    <div className="loading-state">
                        <div className="spinner-large"></div>
                        <p>Loading staff...</p>
                    </div>
                ) : staffList.length === 0 ? (
                    <div className="empty-state">
                        <FiUser className="empty-icon" />
                        <h3>No staff registered yet</h3>
                        <p>Get started by registering your first staff member.</p>
                        <button className="btn-primary" onClick={() => setShowRegisterForm(true)} type="button">
                            <FiPlus /> Register Staff
                        </button>
                    </div>
                ) : (
                    <div className="staff-table-container">
                        <table className="staff-table">
                            <thead>
                            <tr>
                                <th>Staff</th>
                                <th>Username</th>
                                <th>Department</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {staffList.map((staff) => (
                                <tr key={staff.id} className={!staff.active ? 'inactive-row' : ''}>
                                    <td>
                                        <div className="staff-cell">
                                            <div className="staff-avatar">
                                                {staff.fullName?.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <span className="staff-name">{staff.fullName}</span>
                                        </div>
                                    </td>
                                    <td>{staff.username}</td>
                                    <td>{staff.department || '-'}</td>
                                    <td>
                      <span className={`badge ${getRoleBadgeClass(staff.role)}`}>
                        {staff.role.replace('_', ' ')}
                      </span>
                                    </td>
                                    <td>
                      <span className={`badge ${staff.active ? 'badge-active' : 'badge-inactive'}`}>
                        {staff.active ? 'Active' : 'Inactive'}
                      </span>
                                    </td>
                                    <td>{formatDate(staff.createdAt)}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="btn-icon btn-edit"
                                                onClick={() => handleEdit(staff)}
                                                title="Edit staff details"
                                                type="button"
                                            >
                                                <FiEdit2 />
                                            </button>
                                            <button
                                                className="btn-icon btn-password"
                                                onClick={() => handleResetPassword(staff)}
                                                title="Reset password"
                                                type="button"
                                            >
                                                <FiKey />
                                            </button>
                                            <button
                                                className={`btn-icon ${staff.active ? 'btn-deactivate' : 'btn-reactivate'}`}
                                                onClick={() => handleToggleActive(staff)}
                                                title={staff.active ? 'Deactivate' : 'Reactivate'}
                                                type="button"
                                            >
                                                {staff.active ? <FiXCircle /> : <FiCheckCircle />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}