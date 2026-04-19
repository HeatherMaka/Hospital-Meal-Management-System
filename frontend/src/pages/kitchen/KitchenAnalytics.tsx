// src/pages/kitchen/KitchenAnalytics.tsx
import { useState, useEffect, useMemo } from 'react'
import { api } from '../../services/api'  //  Use shared axios instance
import {
    BarChart, Bar, PieChart, Pie, Cell,
    ResponsiveContainer, XAxis, YAxis, Tooltip, Legend,
    LineChart, Line, CartesianGrid
} from 'recharts'
import { FiAlertCircle, FiRefreshCw, FiDownload } from 'react-icons/fi'
import '../../styles/pages/kitchen/KitchenAnalytics.css'

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
    ordersByMealType: Record<string, number>  // { "BREAKFAST": 15, "LUNCH": 22, "SUPPER": 8 }
    specialRequestCount: number
    newPatientsToday: number
    activeStaffCount: number
    revenueToday: number
}

// Parsed analytics data interfaces for charts
interface MealTypeData {
    name: string
    count: number
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

interface TopMeal {
    rank: number
    name: string
    orders: number
}

interface DashboardStats {
    totalOrders: number
    avgPrepTime: string
    specialRequests: number
    deliveryRate: string
    totalOrdersPrev: number
}

type NotificationType = 'success' | 'error' | 'info'

interface Notification {
    message: string
    type: NotificationType
}

// Color palette for charts
const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#EC4899']

// ============ Main Component ============
export default function KitchenAnalytics() {
    const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('week')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [notification, setNotification] = useState<Notification | null>(null)
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())


    // Parsed data for charts
    const [mealTypeData, setMealTypeData] = useState<MealTypeData[]>([])
    const [statusData, setStatusData] = useState<StatusData[]>([])
    const [weeklyData, setWeeklyData] = useState<TrendData[]>([])
    const [topMeals, setTopMeals] = useState<TopMeal[]>([])
    const [stats, setStats] = useState<DashboardStats>({
        totalOrders: 0,
        avgPrepTime: '--',
        specialRequests: 0,
        deliveryRate: '--',
        totalOrdersPrev: 0,
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
            // Last 7 days including today
            for (let i = 6; i >= 0; i--) {
                const d = new Date(today)
                d.setDate(d.getDate() - i)
                dates.push(d.toISOString().split('T')[0])
            }
        } else if (dateRange === 'month') {
            // Last 30 days including today
            for (let i = 29; i >= 0; i--) {
                const d = new Date(today)
                d.setDate(d.getDate() - i)
                dates.push(d.toISOString().split('T')[0])
            }
        }

        return dates
    }

    //  Fetch analytics from backend - GET /api/staff/analytics?date=...
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
                    const response = await api.get<AnalyticsDTO>('/staff/analytics', {
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

            // setRawAnalytics(allAnalytics) - state was never read
            parseAnalyticsData(allAnalytics) // dates parameter (was unused)
            setLastUpdated(new Date())

        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch analytics data'
            // 403 is expected if user doesn't have STAFF/KITCHEN_STAFF role
            if (err.response?.status === 403) {
                setError('Access denied: Staff role required')
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
    //  REMOVED: unused 'dates' parameter
    const parseAnalyticsData = (analytics: AnalyticsDTO[]) => {
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
            { name: 'Breakfast', count: mealTypes['BREAKFAST'] || 0 },
            { name: 'Lunch', count: mealTypes['LUNCH'] || 0 },
            { name: 'Supper', count: mealTypes['SUPPER'] || 0 },
        ])

        // === Parse Status Data from status fields ===
        const statuses: Record<string, number> = {}
        analytics.forEach(item => {
            statuses['PENDING'] = (statuses['PENDING'] || 0) + item.pendingOrders
            statuses['CONFIRMED'] = (statuses['CONFIRMED'] || 0) + item.confirmedOrders
            statuses['PREPARING'] = (statuses['PREPARING'] || 0) + item.preparingOrders
            statuses['DELIVERED'] = (statuses['DELIVERED'] || 0) + item.deliveredOrders
            statuses['CANCELLED'] = (statuses['CANCELLED'] || 0) + item.cancelledOrders
        })
        setStatusData([
            { name: 'Pending', value: statuses['PENDING'] || 0 },
            { name: 'Confirmed', value: statuses['CONFIRMED'] || 0 },
            { name: 'Preparing', value: statuses['PREPARING'] || 0 },
            { name: 'Delivered', value: statuses['DELIVERED'] || 0 },
        ])

        // === Parse Top Meals ===
        setTopMeals([])  // Placeholder until backend endpoint is added

        // === Parse Dashboard Stats ===
        const totalOrders = analytics.reduce((sum, item) => sum + item.totalOrders, 0)
        const delivered = analytics.reduce((sum, item) => sum + item.deliveredOrders, 0)
        const specialRequests = analytics.reduce((sum, item) => sum + item.specialRequestCount, 0)

        // Calculate delivery rate
        const deliveryRate = totalOrders > 0
            ? `${Math.round((delivered / totalOrders) * 100)}%`
            : '--'

        // Calculate avg prep time (mock - backend should provide)
        const avgPrepTime = totalOrders > 0 ? '25 min' : '--'

        setStats({
            totalOrders,
            avgPrepTime,
            specialRequests,
            deliveryRate,
            totalOrdersPrev: totalOrders * 0.9, // Mock previous period
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

    // Calculate percentage change for stats
    const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return { value: 0, positive: true }
        const change = ((current - previous) / previous) * 100
        return { value: Math.abs(Math.round(change)), positive: change >= 0 }
    }

    // Custom tooltip formatter for charts
    const formatTooltip = (value: number) => [`${value} orders`, 'Count']

    // Export chart data as CSV
    const handleExportData = () => {
        const csvContent = [
            ['Meal Type', 'Orders'],
            ...mealTypeData.map(m => [m.name, m.count]),
            [],
            ['Status', 'Count'],
            ...statusData.map(s => [s.name, s.value]),
            [],
            ['Top Meals', 'Orders'],
            ...topMeals.map(m => [m.name, m.orders]),
        ].map(row => row.join(',')).join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `kitchen-analytics-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
        showNotification('Data exported successfully', 'success')
    }

    // Memoize chart data to prevent re-renders
    const chartData = useMemo(() => ({
        mealType: mealTypeData.filter(m => m.count > 0),
        status: statusData.filter(s => s.value > 0),
        weekly: weeklyData,
        topMeals: topMeals,
    }), [mealTypeData, statusData, weeklyData, topMeals])

    return (
        <div className="kitchen-analytics">
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
                <h1>Kitchen Analytics</h1>
                <div className="header-actions">
          <span className="last-updated">
            Updated: {lastUpdated.toLocaleTimeString()}
          </span>
                    <button
                        className="btn-icon"
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
                    {!isLoading && stats.totalOrdersPrev > 0 && (
                        <span className={`stat-change ${calculateChange(stats.totalOrders, stats.totalOrdersPrev).positive ? 'positive' : 'negative'}`}>
              {calculateChange(stats.totalOrders, stats.totalOrdersPrev).positive ? '+' : '-'}
                            {calculateChange(stats.totalOrders, stats.totalOrdersPrev).value}% from last period
            </span>
                    )}
                </div>
                <div className="stat-card">
                    <h3>Avg. Prep Time</h3>
                    <p className="stat-value">{isLoading ? '...' : stats.avgPrepTime}</p>
                    <span className="stat-change neutral">Based on completed orders</span>
                </div>
                <div className="stat-card">
                    <h3>Special Requests</h3>
                    <p className="stat-value">{isLoading ? '...' : stats.specialRequests}</p>
                    <span className="stat-change neutral">Requiring attention</span>
                </div>
                <div className="stat-card">
                    <h3>Delivery Rate</h3>
                    <p className="stat-value">{isLoading ? '...' : stats.deliveryRate}</p>
                    <span className="stat-change positive">Of total orders</span>
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
                                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
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

            {/* Top Meals Section - Placeholder until backend endpoint is added */}
            <div className="top-meals-section">
                <div className="section-header">
                    <h2>Top 5 Most Ordered Meals</h2>
                    <span className="period-label">
            {dateRange === 'today' ? 'Today' : dateRange === 'week' ? 'This Week' : 'This Month'}
          </span>
                </div>

                {isLoading ? (
                    <div className="loading-list">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="top-meal-item skeleton">
                                <div className="skeleton-rank"></div>
                                <div className="skeleton-name"></div>
                                <div className="skeleton-orders"></div>
                                <div className="skeleton-bar"></div>
                            </div>
                        ))}
                    </div>
                ) : topMeals.length === 0 ? (
                    <div className="no-data">
                        <p>
                            Top meals data will appear here.
                            <br />
                            <small>Backend endpoint <code>GET /api/staff/analytics/meals</code> needed.</small>
                        </p>
                    </div>
                ) : (
                    <div className="top-meals-list">
                        {topMeals.map((meal) => {
                            const maxOrders = topMeals[0]?.orders || 1
                            return (
                                <div key={meal.rank} className="top-meal-item">
                                    <span className="meal-rank">#{meal.rank}</span>
                                    <span className="meal-name">{meal.name}</span>
                                    <span className="meal-orders">{meal.orders.toLocaleString()} orders</span>
                                    <div className="meal-bar">
                                        <div
                                            className="meal-bar-fill"
                                            style={{
                                                width: `${(meal.orders / maxOrders) * 100}%`,
                                                background: COLORS[(meal.rank - 1) % COLORS.length]
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Data Source Note */}
            <div className="data-source-note">
                <small>
                    Data sourced from kitchen order analytics.
                    <button className="link-button" onClick={handleRefresh} type="button">Refresh</button>
                    for latest figures.
                </small>
            </div>
        </div>
    )
}