// src/components/layout/AdminLayout.tsx
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { FiHome, FiUsers, FiUserCheck, FiBarChart2, FiLogOut } from 'react-icons/fi'
import '../../styles/components/layout/AdminLayout.css'

export default function AdminLayout() {
    const { user, logout, isLoading } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()

    // Wait for auth to load
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-secondary-light">
                <div className="text-primary-dark text-xl font-semibold animate-pulse">Loading...</div>
            </div>
        )
    }

    // Safety redirect if no user
    if (!user) {
        return null
    }

    const navItems = [
        { path: '/admin', label: 'Dashboard', icon: FiHome },
        { path: '/admin/patients', label: 'Patients', icon: FiUsers },
        { path: '/admin/staff', label: 'Staff Management', icon: FiUserCheck },
        { path: '/admin/analytics', label: 'Analytics', icon: FiBarChart2 },
    ]

    const handleLogout = () => {
        logout()
        navigate('/login', { replace: true })
    }

    // Safe page title lookup
    const currentPage = navItems.find(item => item.path === location.pathname)
    const pageTitle = currentPage?.label || 'Dashboard'

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <h1 className="sidebar-logo">Bac Cuisine</h1>
                    <span className="sidebar-role">Admin</span>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = location.pathname === item.path
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`nav-item ${isActive ? 'active' : ''}`}
                            >
                                <Icon className="nav-icon" />
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">
                            {(user?.name || user?.username || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div className="user-details">
                            <p className="user-name">{user?.name || user?.username || 'Admin'}</p>
                            <p className="user-email">{user?.username}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="logout-button">
                        <FiLogOut />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            <main className="admin-main">
                <header className="admin-header">
                    <h2 className="page-title">{pageTitle}</h2>
                </header>
                <div className="admin-content">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}