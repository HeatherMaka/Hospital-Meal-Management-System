// src/pages/admin/Analytics.tsx
import { useState, useEffect, useMemo } from 'react'
import { api } from '../../services/api'
import {
    BarChart, Bar, PieChart, Pie, Cell,
    ResponsiveContainer, XAxis, YAxis, Tooltip, Legend,
    LineChart, Line, CartesianGrid
} from 'recharts'
import { FiAlertCircle, FiRefreshCw, FiDownload } from 'react-icons/fi'
import '../../styles/pages/admin/Analytics.css'

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
    ordersByMealType: Record<string, number>  // { "CEREAL": , "BREAKFAST": 15, "LUNCH": 22, "LUNCH_DESSERT": , "THREE_PM_TEAS": , "DINNER": 8, "DINNER_DESSERT": , }
    specialRequestCount: number
    newPatientsToday: number
    activeStaffCount: number
    revenueToday: number
}

interface MealTypeData {
    name: string
    orders: number
}

interface StatusData {
    name: string
    value: number
}

interface TrendData {
    day: string
    date: string
    orders: number
}

interface DashboardStats {
    totalOrders: number
    activePatients: number      // newPatientsToday
    mealVarieties: number       // Count of keys in ordersByMealType
    avgOrdersPerDay: number
}

type NotificationType = 'success' | 'error' | 'info'

interface Notification {
    message: string
    type: NotificationType
}

// Color palette for charts
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

// ============ Main Component ============
export default function Analytics() {
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('week')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [notification, setNotification] = useState<Notification | null>(null)
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())


    // Parsed data for charts
    const [mealTypeData, setMealTypeData] = useState<MealTypeData[]>([])
    const [statusData, setStatusData] = useState<StatusData[]>([])
    const [weeklyData, setWeeklyData] = useState<TrendData[]>([])
    const [stats, setStats] = useState<DashboardStats>({
        totalOrders: 0,
        activePatients: 0,
        mealVarieties: 0,
        avgOrdersPerDay: 0,
    })

    // Show notification toast
    const showNotification = (message: string, type: NotificationType) => {
        setNotification({ message, type })
        setTimeout(() => setNotification(null), 4000)
    }

    // Calculate date range for API calls
    const getDateRange = () => {
        const today = new Date()
        const dates: string[] = []

        if (dateRange === 'today') {
            dates.push(today.toISOString().split('T')[0])
        } else if (dateRange === 'week') {
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today)
                d.setDate(d.getDate() - i)
                dates.push(d.toISOString().split('T')[0])
            }
        } else if (dateRange === 'month') {
            for (let i = 29; i >= 0; i--) {
                const d = new Date(today)
                d.setDate(d.getDate() - i)
                dates.push(d.toISOString().split('T')[0])
            }
        }
        return dates
    }

    //  Fetch analytics from backend - GET /api/admin/analytics?date=...
    const fetchAnalytics = async () => {
        try {
            setIsLoading(true)
            setError(null)

            const dates = getDateRange()
            const allAnalytics: AnalyticsDTO[] = []

            // Fetch analytics for each date in range
            for (const date of dates) {
                try {
                    //  Backend returns single AnalyticsDTO, not array
                    const response = await api.get<AnalyticsDTO>('/admin/analytics', {
                        params: { date }
                    })
                    if (response.data) {
                        allAnalytics.push(response.data)
                    }
                } catch (err) {
                    console.warn(`Failed to fetch analytics for ${date}:`, err)
                    // Continue with other dates
                }
            }

            //  setRawAnalytics(allAnalytics) - state was never read
            parseAnalyticsData(allAnalytics, dates)
            setLastUpdated(new Date())

        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch analytics data'
            // 403 is expected if user doesn't have ADMIN role
            if (err.response?.status === 403) {
                setError('Access denied: Admin role required')
            } else {
                setError(errorMessage)
            }
            showNotification('Failed to load analytics', 'error')
            console.error('Error fetching analytics:', err)
        } finally {
            setIsLoading(false)
        }
    }

    //  Parse raw AnalyticsDTO array into structured chart data
    const parseAnalyticsData = (analytics: AnalyticsDTO[], dates: string[]) => {
        // === Parse Meal Type Data from ordersByMealType ===
        const mealTypes: Record<string, number> = {}
        analytics.forEach(item => {
            if (item.ordersByMealType) {
                Object.entries(item.ordersByMealType).forEach(([type, count]) => {
                    mealTypes[type] = (mealTypes[type] || 0) + count
                })
            }
        })
        setMealTypeData([
            { name: 'Cereal', orders: mealTypes['CEREAL'] || 0 },
            { name: 'Breakfast', orders: mealTypes['BREAKFAST'] || 0 },
            { name: 'Lunch', orders: mealTypes['LUNCH'] || 0 },
            { name: 'Lunch_Dessert', orders: mealTypes['LUNCH_DESSERT'] || 0 },
            { name: 'Three_pm_teas', orders: mealTypes['THREE_PM_TEAS'] || 0 },
            { name: 'Dinner', orders: mealTypes['DINNER'] || 0 },
            { name: 'Dinner_Dessert', orders: mealTypes['DINNER_DESSERT'] || 0 },
        ])

        // === Parse Status Data from status fields ===
        const statuses: Record<string, number> = {}
        analytics.forEach(item => {
            statuses['Pending'] = (statuses['Pending'] || 0) + item.pendingOrders
            statuses['Confirmed'] = (statuses['Confirmed'] || 0) + item.confirmedOrders
            statuses['Preparing'] = (statuses['Preparing'] || 0) + item.preparingOrders
            statuses['Delivered'] = (statuses['Delivered'] || 0) + item.deliveredOrders
            statuses['Cancelled'] = (statuses['Cancelled'] || 0) + item.cancelledOrders
        })
        setStatusData([
            { name: 'Pending', value: statuses['Pending'] || 0 },
            { name: 'Confirmed', value: statuses['Confirmed'] || 0 },
            { name: 'Preparing', value: statuses['Preparing'] || 0 },
            { name: 'Delivered', value: statuses['Delivered'] || 0 },
        ])

        // === Parse Dashboard Stats ===
        const totalOrders = analytics.reduce((sum, item) => sum + item.totalOrders, 0)
        const activePatients = analytics.reduce((sum, item) => sum + item.newPatientsToday, 0)
        const mealVarieties = Object.keys(analytics[0]?.ordersByMealType || {}).length

        const daysInRange = dates.length
        const avgOrdersPerDay = daysInRange > 0 ? Math.round(totalOrders / daysInRange) : 0

        setStats({
            totalOrders,
            activePatients,
            mealVarieties,
            avgOrdersPerDay,
        })

        // === Generate Weekly Trend Data from analytics ===
        const trendData: TrendData[] = analytics.map(item => {
            const dayName = new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })
            return {
                day: dayName,
                date: item.date,
                orders: item.totalOrders,
            }
        })
        setWeeklyData(trendData)
    }

    // Initial load and when dateRange changes
    useEffect(() => {
        fetchAnalytics()
    }, [dateRange])

    // Manual refresh handler
    const handleRefresh = () => {
        fetchAnalytics()
        showNotification('Refreshing analytics...', 'info')
    }

    // Custom tooltip formatter for charts
    const formatTooltip = (value: number) => [`${value} orders`, 'Count']

    // Export chart data as CSV
    const handleExportData = () => {
        const csvContent = [
            ['Meal Type', 'Orders'],
            ...mealTypeData.map(m => [m.name, m.orders]),
            [],
            ['Status', 'Count'],
            ...statusData.map(s => [s.name, s.value]),
        ].map(row => row.join(',')).join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `admin-analytics-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
        showNotification('Data exported successfully', 'success')
    }

    // Memoize chart data to prevent re-renders
    const chartData = useMemo(() => ({
        mealType: mealTypeData.filter(m => m.orders > 0),
        status: statusData.filter(s => s.value > 0),
        weekly: weeklyData,
    }), [mealTypeData, statusData, weeklyData])

    return (
        <div className="analytics-page">
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

            <div className="page-header">
                <h1>Analytics Dashboard</h1>
                <div className="header-actions">
          <span className="last-updated">
            Updated: {lastUpdated.toLocaleTimeString()}
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
                    <button
                        className="btn-secondary"
                        onClick={handleExportData}
                        disabled={isLoading}
                        title="Export data"
                        type="button"
                    >
                        <FiDownload /> Export
                    </button>
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value as 'today' | 'week' | 'month')}
                        className="date-range-select"
                        disabled={isLoading}
                    >
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                    </select>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="alert alert-error">
                    <FiAlertCircle />
                    <span>{error}</span>
                    <button className="alert-close" onClick={() => setError(null)} type="button">×</button>
                </div>
            )}

            {/* Stats Overview */}
            <div className="stats-overview">
                <div className="stat-card">
                    <h3>Total Orders</h3>
                    <p className="stat-value">{isLoading ? '...' : stats.totalOrders.toLocaleString()}</p>
                </div>
                <div className="stat-card">
                    <h3>Active Patients</h3>
                    <p className="stat-value">{isLoading ? '...' : stats.activePatients.toLocaleString()}</p>
                </div>
                <div className="stat-card">
                    <h3>Meal Varieties</h3>
                    <p className="stat-value">{isLoading ? '...' : stats.mealVarieties}</p>
                </div>
                <div className="stat-card">
                    <h3>Avg Orders/Day</h3>
                    <p className="stat-value">{isLoading ? '...' : stats.avgOrdersPerDay.toLocaleString()}</p>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="charts-grid">
                {/* Orders by Meal Type - Bar Chart */}
                <div className="chart-card">
                    <h2>Orders by Meal Type</h2>
                    {isLoading || chartData.mealType.length === 0 ? (
                        <div className="chart-placeholder">
                            {isLoading ? 'Loading chart...' : 'No meal type data available'}
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData.mealType} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip formatter={formatTooltip} />
                                <Legend />
                                <Bar dataKey="orders" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Order Status Distribution - Pie Chart */}
                <div className="chart-card">
                    <h2>Order Status Distribution</h2>
                    {isLoading || chartData.status.length === 0 ? (
                        <div className="chart-placeholder">
                            {isLoading ? 'Loading chart...' : 'No status data available'}
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={chartData.status}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={90}
                                    dataKey="value"
                                >
                                    {chartData.status.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => [`${value} orders`, 'Count']} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Weekly Order Trend - Line Chart */}
                <div className="chart-card full-width">
                    <h2>Order Trend ({dateRange === 'today' ? 'Today' : dateRange === 'week' ? 'This Week' : 'This Month'})</h2>
                    {isLoading || chartData.weekly.length === 0 ? (
                        <div className="chart-placeholder">
                            {isLoading ? 'Loading chart...' : 'No trend data available'}
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData.weekly} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip formatter={formatTooltip} />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="orders"
                                    stroke="#3B82F6"
                                    strokeWidth={2}
                                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Data Source Note */}
            <div className="data-source-note">
                <small>
                    Data sourced from admin analytics.
                    <button className="link-button" onClick={handleRefresh} type="button">Refresh</button>
                    for latest figures.
                </small>
            </div>
        </div>
    )
}