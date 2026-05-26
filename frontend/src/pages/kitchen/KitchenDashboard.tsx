// src/pages/kitchen/KitchenDashboard.tsx
import { useState, useEffect } from 'react'
import { api } from '../../services/api'  // Use shared axios instance
import { useNavigate } from 'react-router-dom'
import {
    FiClock, FiCheckCircle, FiAlertCircle, FiPackage,
    FiRefreshCw, FiArrowRight
} from 'react-icons/fi'
import '../../styles/pages/kitchen/KitchenDashboard.css'

// ============ TypeScript Interfaces (Match Backend AnalyticsDTO) ============

// Backend AnalyticsDTO structure
export interface AnalyticsDTO {
    date: string
    totalOrders: number
    pendingOrders: number
    confirmedOrders: number
    preparingOrders: number
    deliveredOrders: number
    cancelledOrders: number
    ordersByMealType: Record<string, number>  // { "BREAKFAST": 15, "LUNCH": 22 }
    specialRequestCount: number
    newPatientsToday: number
    activeStaffCount: number
    revenueToday: number
}

export interface DashboardStats {
    pendingOrders: number
    readyOrders: number
    preparingOrders: number
    deliveredOrders: number
    specialRequests: number
}

// ============ Main Component ============
export default function KitchenDashboard() {
    const navigate = useNavigate()
    const [stats, setStats] = useState<DashboardStats>({
        pendingOrders: 0,
        readyOrders: 0,
        preparingOrders: 0,
        deliveredOrders: 0,
        specialRequests: 0,
    })
    const [isLoading, setIsLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
    const [error, setError] = useState<string | null>(null)

    // Fetch dashboard analytics from backend - GET /api/staff/analytics?date=...
    const fetchDashboardData = async () => {
        try {
            setIsLoading(true)
            setError(null)
            const today = new Date().toISOString().split('T')[0]

            // Fetch analytics summary using shared api helper
            const response = await api.get<AnalyticsDTO>('/staff/analytics', {
                params: { date: today }
            })
            const analytics = response.data

            // Map backend AnalyticsDTO to frontend DashboardStats
            setStats({
                pendingOrders: analytics.pendingOrders ?? 0,
                readyOrders: analytics.confirmedOrders ?? 0,
                preparingOrders: analytics.preparingOrders ?? 0,
                deliveredOrders: analytics.deliveredOrders ?? 0,
                specialRequests: analytics.specialRequestCount ?? 0,
            })

            setLastUpdated(new Date())

        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch dashboard data'
            // 403 is expected if user doesn't have STAFF/KITCHEN_STAFF role
            if (err.response?.status === 403) {
                setError('Access denied: Staff role required')
            } else {
                setError(errorMessage)
            }
            console.error('Error fetching dashboard data:', err)
            // Set default zeros on error
            setStats({
                pendingOrders: 0,
                readyOrders: 0,
                preparingOrders: 0,
                deliveredOrders: 0,
                specialRequests: 0,
            })
        } finally {
            setIsLoading(false)
        }
    }

    // Initial load and auto-refresh every 30 seconds
    useEffect(() => {
        fetchDashboardData()
        const interval = setInterval(fetchDashboardData, 30000) // 30 seconds
        return () => clearInterval(interval)
    }, [])

    // Manual refresh handler
    const handleRefresh = () => {
        fetchDashboardData()
    }

    // Format last updated time
    const formatLastUpdated = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        })
    }

    // Stat card configuration - match backend status names
    const statCards = [
        {
            title: 'Pending Orders',
            value: stats.pendingOrders,
            icon: FiClock,
            color: 'yellow',
            route: '/kitchen/orders?status=PENDING'
        },
        {
            title: 'Ready',
            value: stats.readyOrders,
            icon: FiAlertCircle,
            color: 'blue',
            route: '/kitchen/orders?status=READY'
        },
        {
            title: 'Preparing',
            value: stats.preparingOrders,
            icon: FiPackage,
            color: 'purple',
            route: '/kitchen/orders?status=PREPARING'
        },
        {
            title: 'Delivered',
            value: stats.deliveredOrders,
            icon: FiCheckCircle,
            color: 'green',
            route: '/kitchen/orders?status=DELIVERED'
        },
        {
            title: 'Special Requests',
            value: stats.specialRequests,
            icon: FiAlertCircle,
            color: 'red',
            route: '/kitchen/orders?special=true'
        },
    ]

    // Quick actions configuration
    const quickActions = [
        { label: 'View All Orders', route: '/kitchen/orders', primary: true },
        { label: 'Manage Menu', route: '/kitchen/menu' },
        { label: 'Special Requests', route: '/kitchen/orders?special=true' },
        { label: 'View Analytics', route: '/kitchen/analytics' },
    ]

    return (
        <div className="kitchen-dashboard">
            <div className="dashboard-header">
                <div>
                    <h1>Kitchen Dashboard</h1>
                    <p className="date-display">
                        {new Date().toLocaleDateString('en-US', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                        })}
                    </p>
                </div>
                <div className="header-actions">
          <span className="last-updated">
            Updated: {formatLastUpdated(lastUpdated)}
          </span>
                    <button
                        className="btn-refresh"
                        onClick={handleRefresh}
                        disabled={isLoading}
                        title="Refresh data"
                        type="button"
                    >
                        <FiRefreshCw className={isLoading ? 'spinning' : ''} />
                    </button>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="alert alert-error">
                    <FiAlertCircle />
                    <span>{error}</span>
                    <button className="alert-close" onClick={() => setError(null)} type="button">
                        <FiClock />
                    </button>
                </div>
            )}

            {/* Stats Grid */}
            <div className="stats-grid">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon
                    return (
                        <div
                            key={index}
                            className={`stat-card stat-${stat.color} ${isLoading ? 'loading' : ''}`}
                            onClick={() => !isLoading && navigate(stat.route)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (!isLoading && (e.key === 'Enter' || e.key === ' ')) {
                                    e.preventDefault()
                                    navigate(stat.route)
                                }
                            }}
                        >
                            <div className="stat-icon">
                                {isLoading ? (
                                    <div className="skeleton-icon"></div>
                                ) : (
                                    <Icon />
                                )}
                            </div>
                            <div className="stat-info">
                                <h3 className={isLoading ? 'skeleton-text' : ''}>
                                    {isLoading ? '---' : stat.value}
                                </h3>
                                <p>{stat.title}</p>
                            </div>
                            {!isLoading && (
                                <div className="stat-arrow">
                                    <FiArrowRight />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <h2>Quick Actions</h2>
                <div className="action-buttons">
                    {quickActions.map((action, index) => (
                        <button
                            key={index}
                            className={`action-btn ${action.primary ? 'primary' : ''}`}
                            onClick={() => navigate(action.route)}
                            type="button"
                        >
                            {action.label}
                            <FiArrowRight />
                        </button>
                    ))}
                </div>
            </div>

            {/* Recent Activity Placeholder - Can be expanded later */}
            <div className="recent-activity">
                <h2>Recent Activity</h2>
                <div className="activity-list">
                    {isLoading ? (
                        <>
                            <div className="activity-item skeleton"></div>
                            <div className="activity-item skeleton"></div>
                            <div className="activity-item skeleton"></div>
                        </>
                    ) : (
                        <p className="no-activity">
                            Activity feed will appear here. Check orders for real-time updates.
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}