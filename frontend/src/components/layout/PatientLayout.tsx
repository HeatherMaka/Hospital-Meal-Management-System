// src/components/layout/PatientLayout.tsx
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { FiList, FiUser, FiLogOut, FiCoffee } from 'react-icons/fi'
// import '../../styles/components/layout/PatientLayout.css' // ← Temporarily comment out to test

export default function PatientLayout() {
    const { user, logout, isLoading } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()

    console.log(' PatientLayout rendering:', {
        isLoading,
        user: user ? { username: user.username, role: user.role } : null,
        path: location.pathname
    })

    //  Wait for auth to load - with visible fallback
    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef3c7' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#92400e', padding: '1rem', backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    ⏳ Loading...
                </div>
            </div>
        )
    }

    //  Safety redirect if no user
    if (!user) {
        console.log(' No user in PatientLayout')
        return null // ProtectedRoute handles redirect
    }

    const navItems = [
        { path: '/patient', label: 'Menu', icon: FiCoffee },
        { path: '/patient/orders', label: 'Order History', icon: FiList },
        { path: '/patient/profile', label: 'Profile', icon: FiUser },
    ]

    const handleLogout = () => {
        logout()
        navigate('/login', { replace: true })
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#f8fafc', // Visible fallback color
            border: '2px solid #3b82f6' // Debug border
        }}>
            {/* Header */}
            <header style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 2rem',
                backgroundColor: 'white',
                borderBottom: '1px solid #e2e8f0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <FiCoffee size={24} color="#3b82f6" />
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>Bac Cuisine</h1>
                </div>

                <nav style={{ display: 'flex', gap: '0.5rem' }}>
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = location.pathname === item.path
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    color: isActive ? '#3b82f6' : '#64748b',
                                    backgroundColor: isActive ? '#eff6ff' : 'transparent',
                                    fontWeight: isActive ? 600 : 400,
                                    textDecoration: 'none'
                                }}
                            >
                                <Icon size={18} />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 500, color: '#1e293b' }}>
                            {user?.name || user?.username || 'Patient'}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                            {user?.wardNumber ? `Ward ${user.wardNumber}` : ''}
                            {user?.bedNumber ? ` • Bed ${user.bedNumber}` : ''}
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '0.5rem',
                            borderRadius: '0.375rem',
                            color: '#64748b',
                            backgroundColor: 'transparent',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        aria-label="Logout"
                    >
                        <FiLogOut size={18} />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main style={{
                flex: 1,
                padding: '2rem',
                backgroundColor: '#f1f5f9' // Visible fallback
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    backgroundColor: 'white',
                    borderRadius: '0.5rem',
                    padding: '1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    border: '2px dashed #22c55e' // Debug border for Outlet
                }}>
                    {/*  This renders PatientMenu, OrderHistory, or PatientProfile */}
                    <Outlet />
                </div>
            </main>
        </div>
    )
}