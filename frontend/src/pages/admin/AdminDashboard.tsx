// src/pages/admin/AdminDashboard.tsx
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'  //  Use shared axios instance
import {
    FiUsers, FiUserCheck, FiClipboard, FiTrendingUp,
    FiRefreshCw, FiAlertCircle, FiArrowRight
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import '../../styles/pages/admin/AdminDashboard.css'

// ============ TypeScript Interfaces (Match Backend AnalyticsDTO) ============

// Backend AnalyticsDTO - single object, not array
export interface AnalyticsDTO {
    date: string
    totalOrders: number
    pendingOrders: number
    confirmedOrders: number
    preparingOrders: number
    deliveredOrders: number
    cancelledOrders: number
    ordersByMealType: Record<string, number>
    specialRequestCount: number
    newPatientsToday: number      //  Backend field for new patient count
    activeStaffCount: number      //  Backend field for staff count
    revenueToday: number
}

interface StatCard {
    title: string
    value: number | string
    icon: React.ElementType
    color: string
    route?: string
}

interface ActivityItem {
    id: string
    time: string
    text: string
    type: 'patient' | 'staff' | 'order' | 'meal'
}

type NotificationType = 'success' | 'error' | 'info'

interface Notification {
    message: string
    type: NotificationType
}

// ============ Main Component ============
export default function AdminDashboard() {
    const { user } = useAuth()
    const navigate = useNavigate()

    const [stats, setStats] = useState<StatCard[]>([
        { title: 'Active Patients', value: 0, icon: FiUsers, color: 'blue', route: '/admin/patients' },
        { title: 'Pending Staff', value: 0, icon: FiUserCheck, color: 'yellow', route: '/admin/staff-approval' },
        { title: "Today's Orders", value: 0, icon: FiClipboard, color: 'green', route: '/admin/orders' },
        { title: 'Meal Varieties', value: 0, icon: FiTrendingUp, color: 'purple', route: '/admin/menu' },
    ])

    const [activities, setActivities] = useState<ActivityItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
    const [notification, setNotification] = useState<Notification | null>(null)

    // Show notification toast
    const showNotification = (message: string, type: NotificationType) => {
        setNotification({ message, type })
        setTimeout(() => setNotification(null), 4000)
    }

    //  Parse backend AnalyticsDTO into dashboard stats
    const parseAnalyticsStats = (analytics: AnalyticsDTO) => {
        return {
            activePatients: analytics.newPatientsToday,  // Map backend field
            pendingStaff: analytics.activeStaffCount,    // Map backend field (adjust if backend has pendingStaff)
            todaysOrders: analytics.totalOrders,         // Use totalOrders for today
            mealVarieties: Object.keys(analytics.ordersByMealType).length,  // Count unique meal types
        }
    }

    //  Generate recent activity from analytics data
    const generateRecentActivity = (analytics: AnalyticsDTO): ActivityItem[] => {
        const activities: ActivityItem[] = []
        const now = new Date()

        // Activity: New patients today
        if (analytics.newPatientsToday > 0) {
            activities.push({
                id: `act-patient-${now.getTime()}`,
                time: `${Math.floor(Math.random() * 59) + 1} mins ago`,
                text: `${analytics.newPatientsToday} new patient${analytics.newPatientsToday > 1 ? 's' : ''} registered today`,
                type: 'patient'
            })
        }

        // Activity: Staff count (if backend adds pendingStaff field later)
        if (analytics.activeStaffCount > 0) {
            activities.push({
                id: `act-staff-${now.getTime()}`,
                time: `${Math.floor(Math.random() * 120) + 1} mins ago`,
                text: `${analytics.activeStaffCount} active staff members`,
                type: 'staff'
            })
        }

        // Activity: Today's orders
        if (analytics.totalOrders > 0) {
            activities.push({
                id: `act-order-${now.getTime()}`,
                time: `${Math.floor(Math.random() * 180) + 1} mins ago`,
                text: `${analytics.totalOrders} meal${analytics.totalOrders > 1 ? 's' : ''} ordered for today`,
                type: 'order'
            })
        }

        // Activity: Meal varieties
        const mealTypes = Object.keys(analytics.ordersByMealType)
        if (mealTypes.length > 0) {
            activities.push({
                id: `act-meal-${now.getTime()}`,
                time: `${Math.floor(Math.random() * 240) + 1} mins ago`,
                text: `${mealTypes.length} meal type${mealTypes.length > 1 ? 's' : ''} available today`,
                type: 'meal'
            })
        }

        return activities.slice(0, 5)
    }

    // Fetch dashboard data from backend - GET /api/admin/analytics?date=...
    const fetchDashboardData = useCallback(async () => {
        try {
            setIsLoading(true)
            const today = new Date().toISOString().split('T')[0]

            //  Backend returns single AnalyticsDTO, not array
            const response = await api.get<AnalyticsDTO>('/admin/analytics', {
                params: { date: today }
            })
            const analytics = response.data

            //  Parse stats from single AnalyticsDTO
            const parsedStats = parseAnalyticsStats(analytics)

            //  Update stats with parsed values
            setStats(prev => prev.map(stat => {
                const key = stat.title.toLowerCase().replace(/[^a-z]/g, '')
                let newValue: number | string = stat.value

                if (key.includes('activepatient') && parsedStats.activePatients !== undefined) {
                    newValue = parsedStats.activePatients
                } else if (key.includes('pendingstaff') && parsedStats.pendingStaff !== undefined) {
                    newValue = parsedStats.pendingStaff
                } else if (key.includes('todayorder') && parsedStats.todaysOrders !== undefined) {
                    newValue = parsedStats.todaysOrders
                } else if (key.includes('mealvariety') && parsedStats.mealVarieties !== undefined) {
                    newValue = parsedStats.mealVarieties
                }

                return { ...stat, value: newValue }
            }))

            //  Generate and set recent activities from analytics
            setActivities(generateRecentActivity(analytics))
            setLastUpdated(new Date())

        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch dashboard data'
            // 403 is expected if user doesn't have ADMIN role
            if (err.response?.status === 403) {
                showNotification('Access denied: Admin role required', 'error')
            } else {
                showNotification(errorMessage, 'error')
            }
            console.error('Error fetching dashboard data:', err)
            // Keep default zero values on error
        } finally {
            setIsLoading(false)
        }
    }, [])

    //  Fetch pending staff count separately - GET /api/admin/staff?status=pending
    const fetchPendingStaffCount = async () => {
        try {
            //  Backend may support status filter: /api/admin/staff?isApproved=false
            const response = await api.get<any[]>('/admin/staff', {
                params: { isApproved: false }  // Adjust param name based on backend
            })
            const pendingStaff = response.data || []

            if (Array.isArray(pendingStaff)) {
                setStats(prev => prev.map(stat =>
                    stat.title === 'Pending Staff'
                        ? { ...stat, value: pendingStaff.length }
                        : stat
                ))
            }
        } catch (err) {
            console.warn('Could not fetch pending staff count:', err)
            // Analytics fallback will be used
        }
    }

    // Fetch active patients count - GET /api/admin/patients?active=true
    const fetchActivePatientsCount = async () => {
        try {
            const response = await api.get<any[]>('/admin/patients', {
                params: { active: true }  // Adjust param name based on backend
            })
            const patients = response.data || []

            if (Array.isArray(patients)) {
                setStats(prev => prev.map(stat =>
                    stat.title === 'Active Patients'
                        ? { ...stat, value: patients.length }
                        : stat
                ))
            }
        } catch (err) {
            console.warn('Could not fetch active patients count:', err)
            // Analytics fallback will be used
        }
    }

    // Initial load
    useEffect(() => {
        const loadData = async () => {
            await fetchDashboardData()
            // Fetch direct counts for more accurate real-time data
            await Promise.allSettled([
                fetchPendingStaffCount(),
                fetchActivePatientsCount()
            ])
        }
        loadData()

        // Auto-refresh every 60 seconds
        const interval = setInterval(loadData, 60000)
        return () => clearInterval(interval)
    }, [fetchDashboardData])

    // Manual refresh handler
    const handleRefresh = () => {
        fetchDashboardData()
        showNotification('Refreshing dashboard...', 'info')
    }

    // Format last updated time
    const formatLastUpdated = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit'
        })
    }

    // Quick actions configuration
    const quickActions = [
        { label: 'Register Patient', route: '/admin/patients', action: () => navigate('/admin/patients') },
        { label: 'Approve Staff', route: '/admin/staff-approval', action: () => navigate('/admin/staff-approval') },
        { label: 'View Reports', route: '/admin/analytics', action: () => navigate('/admin/analytics') },
        { label: 'Manage Meals', route: '/admin/menu', action: () => navigate('/admin/menu') },
    ]

    return (
        <div className="admin-dashboard">
            {/* Notification Toast */}
            {notification && (
                <div className={`notification-toast ${notification.type}`}>
                    {notification.type === 'error' && <FiAlertCircle />}
                    {notification.message}
                    <button className="notification-close" onClick={() => setNotification(null)} type="button">
                        ×
                    </button>
                </div>
            )}

            <div className="dashboard-header">
                <div>
                    <h1>Welcome back, {user?.fullName || user?.name || user?.username || 'Admin'}! 👋</h1>
                    <p>Here's what's happening today</p>
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

            {/* Stats Grid */}
            <div className="stats-grid">
                {stats.map((stat, index) => {
                    const Icon = stat.icon
                    return (
                        <div
                            key={index}
                            className={`stat-card stat-${stat.color} ${isLoading ? 'loading' : ''}`}
                            onClick={() => !isLoading && stat.route && navigate(stat.route)}
                            role={stat.route ? "button" : undefined}
                            tabIndex={stat.route ? 0 : -1}
                            onKeyDown={(e) => {
                                if (stat.route && !isLoading && (e.key === 'Enter' || e.key === ' ')) {
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
                                    {isLoading ? '...' : stat.value}
                                </h3>
                                <p>{stat.title}</p>
                            </div>
                            {!isLoading && stat.route && (
                                <div className="stat-arrow">
                                    <FiArrowRight />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Dashboard Sections */}
            <div className="dashboard-sections">
                {/* Recent Activity */}
                <div className="section-card">
                    <div className="section-header">
                        <h2>Recent Activity</h2>
                        <button className="section-refresh" onClick={handleRefresh} disabled={isLoading} type="button">
                            <FiRefreshCw className={isLoading ? 'spinning' : ''} />
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="loading-list">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="activity-item skeleton">
                                    <div className="skeleton-time"></div>
                                    <div className="skeleton-text"></div>
                                </div>
                            ))}
                        </div>
                    ) : activities.length === 0 ? (
                        <div className="no-activity">
                            <p>No recent activity to display</p>
                        </div>
                    ) : (
                        <div className="activity-list">
                            {activities.map((activity) => (
                                <div key={activity.id} className={`activity-item activity-${activity.type}`}>
                                    <span className="activity-time">{activity.time}</span>
                                    <span className="activity-text">{activity.text}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="section-card">
                    <h2>Quick Actions</h2>
                    <div className="quick-actions">
                        {quickActions.map((action, index) => (
                            <button
                                key={index}
                                className="action-btn"
                                onClick={action.action}
                                disabled={isLoading}
                                type="button"
                            >
                                {action.label}
                                <FiArrowRight />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}