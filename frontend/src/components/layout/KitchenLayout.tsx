// src/components/layout/KitchenLayout.tsx
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { FiHome, FiCalendar, FiList, FiBarChart2, FiLogOut } from 'react-icons/fi'
import '../../styles/components/layout/KitchenLayout.css'

export default function KitchenLayout() {
    const { user, logout, isLoading } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()

    //  Wait for auth to load
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-secondary-light">
                <div className="text-primary-dark text-xl font-semibold animate-pulse">Loading...</div>
            </div>
        )
    }

    //  Safety redirect if no user
    if (!user) {
        return null
    }

    const navItems = [
        { path: '/kitchen', label: 'Dashboard', icon: FiHome },
        { path: '/kitchen/menu', label: 'Menu Management', icon: FiCalendar },
        { path: '/kitchen/orders', label: 'Orders', icon: FiList },
        { path: '/kitchen/analytics', label: 'Analytics', icon: FiBarChart2 },
    ]

    const handleLogout = () => {
        logout()
        navigate('/login', { replace: true })
    }

    //  Safe page title lookup
    const currentPage = navItems.find(item => item.path === location.pathname)
    const pageTitle = currentPage?.label || 'Dashboard'

    return (
        <div className="kitchen-layout">
            <aside className="kitchen-sidebar">
                <div className="sidebar-header">
                    <h1 className="sidebar-logo">Bac Cuisine</h1>
                    <span className="sidebar-role">Kitchen Staff</span>
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
                            {user?.username?.charAt(0).toUpperCase() || 'K'}
                        </div>
                        <div className="user-details">
                            <p className="user-name">{user?.username || 'Kitchen Staff'}</p>
                            <p className="user-role">Staff</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="logout-button">
                        <FiLogOut />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            <main className="kitchen-main">
                <header className="kitchen-header">
                    <h2 className="page-title">{pageTitle}</h2>
                    <div className="header-date">
                        {new Date().toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </div>
                </header>
                <div className="kitchen-content">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}