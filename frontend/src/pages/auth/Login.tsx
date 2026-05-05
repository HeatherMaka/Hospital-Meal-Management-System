// src/pages/auth/Login.tsx
import { useState, FormEvent} from 'react'
import { useNavigate, useLocation} from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import '../../styles/pages/auth/Login.css'

export default function Login() {
    const [activeTab, setActiveTab] = useState<'staff' | 'patient'>('staff')
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        wardNumber: '',
        bedNumber: '',
        nin: '',
    })
    const [error, setError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { user, login, patientLogin, isLoading: authLoading } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    // Wait for auth context to finish loading before any redirect
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-secondary-light">
                <div className="text-primary-dark text-xl font-semibold animate-pulse">Loading...</div>
            </div>
        )
    }

    //  Redirect if already authenticated (but prevent loop by checking path)
    if (user) {
        const from = (location.state as any)?.from?.pathname
        const targetPath = from || (
            user.role === 'ADMIN' ? '/admin' :
                user.role === 'STAFF' ? '/kitchen' :
                    '/patient'
        )

        // Only navigate if we're not already at the target
        if (location.pathname !== targetPath) {
            navigate(targetPath, { replace: true })
        }
        return null
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        })
        setError('')
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError('')

        try {
            if (activeTab === 'staff') {
                await login(formData.username, formData.password)
                //  Let the ProtectedRoute/PublicRoute handle redirect after login
                // Don't navigate here - auth state change will trigger redirect
            } else {
                await patientLogin(formData.wardNumber, formData.bedNumber, formData.nin)
            }
        } catch (err: any) {
            console.error('Login error details:', err)
            console.error('Response data:', err.response?.data)
            console.error('Response status:', err.response?.status)
            console.error('Response headers:', err.response?.headers)

            // Show more specific error message
            let errorMessage = 'Login failed. Please try again.'

            if (err.response?.status === 401) {
                errorMessage = 'Invalid username or password'
            } else if (err.response?.status === 403) {
                errorMessage = 'Account is disabled or access denied'
            } else if (err.response?.status === 400) {
                errorMessage = err.response?.data?.message || 'Invalid request data'
            } else if (err.response?.status >= 500) {
                errorMessage = 'Server error. Please try again later.'
            } else if (!err.response) {
                errorMessage = 'Cannot connect to server. Please check if backend is running.'
            }

            setError(errorMessage)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h1 className="login-title">Bac Cuisine</h1>
                    <p className="login-subtitle">Hospital Meal Management System</p>
                </div>

                <div className="login-tabs">
                    <button
                        className={`login-tab ${activeTab === 'staff' ? 'active' : ''}`}
                        onClick={() => setActiveTab('staff')}
                        type="button"
                    >
                        Staff/Admin
                    </button>
                    <button
                        className={`login-tab ${activeTab === 'patient' ? 'active' : ''}`}
                        onClick={() => setActiveTab('patient')}
                        type="button"
                    >
                        Patient
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {activeTab === 'staff' ? (
                        <>
                            <div className="form-group">
                                <label htmlFor="username">Username</label>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    placeholder="Enter username"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="password">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="Enter password"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="form-group">
                                <label htmlFor="wardNumber">Ward Number</label>
                                <input
                                    type="text"
                                    id="wardNumber"
                                    name="wardNumber"
                                    value={formData.wardNumber}
                                    onChange={handleInputChange}
                                    placeholder="e.g., A1"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="bedNumber">Bed Number</label>
                                <input
                                    type="text"
                                    id="bedNumber"
                                    name="bedNumber"
                                    value={formData.bedNumber}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 101"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="nin">National ID Number</label>
                                <input
                                    type="text"
                                    id="nin"
                                    name="nin"
                                    value={formData.nin}
                                    onChange={handleInputChange}
                                    placeholder="Enter NIN"
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>
                        </>
                    )}

                    {error && <div className="error-message" role="alert">{error}</div>}

                    <button
                        type="submit"
                        className="login-button"
                        disabled={isSubmitting || authLoading}
                    >
                        {isSubmitting ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="login-footer">
                    <p>© {new Date().getFullYear()} Bac Cuisine. All rights reserved.</p>
                </div>
            </div>
        </div>
    )
}