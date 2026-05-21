// src/pages/patient/OrderHistory.tsx
import { useState, useEffect } from 'react'
import { api } from '../../services/api'  // Use shared axios instance
import { FiClock, FiCheckCircle, FiPackage, FiXCircle, FiAlertCircle, FiRefreshCw } from 'react-icons/fi'
import '../../styles/pages/patient/OrderHistory.css'

// ============ TypeScript Interfaces (Match Backend OrderDTO) ============

// Backend OrderDTO fields
export interface Order {
    id: number
    patientId: number
    patientName: string
    wardNumber: string
    bedNumber: string
    mealId: number
    mealName: string
    mealType: 'CEREAL' | 'BREAKFAST' | 'LUNCH' | 'LUNCH_DESSERT' | 'THREE_PM_TEAS' | 'DINNER' | 'DINNER_DESSERT'
    orderDate: string           // ISO date "YYYY-MM-DD" (backend field name)
    quantity: number
    specialRequest?: string | null
    status: 'PENDING' | 'READY' | 'PREPARING' | 'DELIVERED' | 'CANCELLED'
    orderedAt: string           // ISO datetime (backend: createdAt)
    updatedAt?: string
}

type NotificationType = 'success' | 'error' | 'info'

interface Notification {
    message: string
    type: NotificationType
}

// ============ Main Component ============
export default function OrderHistory() {
    const [orders, setOrders] = useState<Order[]>([])
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [isLoading, setIsLoading] = useState(true)
    const [notification, setNotification] = useState<Notification | null>(null)

    // Show notification toast
    const showNotification = (message: string, type: NotificationType) => {
        setNotification({ message, type })
        setTimeout(() => setNotification(null), 4000)
    }

    //  Fetch orders from backend - GET /api/patient/orders?date=...
    const fetchOrders = async (date: string) => {
        try {
            setIsLoading(true)
            const response = await api.get<Order[]>('/patient/orders', {
                params: { date }  // Backend expects date query param
            })
            setOrders(response.data || [])
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch orders'
            // 403 is expected if user doesn't have PATIENT role or token expired
            if (err.response?.status === 401 || err.response?.status === 403) {
                showNotification('Please login to view your orders', 'error')
            } else {
                showNotification(errorMessage, 'error')
            }
            console.error('Error fetching orders:', err)
            setOrders([])
        } finally {
            setIsLoading(false)
        }
    }

    // Initial load and when date changes
    useEffect(() => {
        fetchOrders(selectedDate)
    }, [selectedDate])

    // Manual refresh handler
    const handleRefresh = () => {
        fetchOrders(selectedDate)
        showNotification('Refreshing orders...', 'info')
    }

    // Get icon for status badge
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PENDING': return <FiClock className="status-icon" />
            case 'READY': return <FiClock className="status-icon" />
            case 'PREPARING': return <FiPackage className="status-icon" />
            case 'DELIVERED': return <FiCheckCircle className="status-icon" />
            case 'CANCELLED': return <FiXCircle className="status-icon" />
            default: return <FiClock className="status-icon" />
        }
    }

    // Get CSS class for status badge
    const getStatusClass = (status: string) => {
        return `status-${status.toLowerCase()}`
    }

    // Format date for display
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric'
        })
    }

    // Format time for display
    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit'
        })
    }

    return (
        <div className="order-history">
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
                <h1>Order History</h1>
                <div className="header-actions">
                    <div className="date-selector-small">
                        <FiClock />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                        />
                    </div>
                    <button
                        className="btn-refresh"
                        onClick={handleRefresh}
                        disabled={isLoading}
                        title="Refresh orders"
                        type="button"
                    >
                        <FiRefreshCw className={isLoading ? 'spinning' : ''} />
                    </button>
                </div>
            </div>

            <div className="orders-list">
                {isLoading ? (
                    <div className="loading-state">
                        <div className="spinner-large"></div>
                        <p>Loading your orders...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="no-orders">
                        <h2>No Orders Yet</h2>
                        <p>
                            {selectedDate === new Date().toISOString().split('T')[0]
                                ? "You haven't placed any orders today. Start ordering from the menu!"
                                : `No orders found for ${formatDate(selectedDate)}`
                            }
                        </p>
                    </div>
                ) : (
                    orders.map((order) => (
                        <div key={order.id} className="order-card">
                            <div className="order-info">
                                <h3>{order.mealName}</h3>
                                <p className="order-meta">
                                    {order.mealType} • Ordered: {formatDate(order.orderedAt)} at {formatTime(order.orderedAt)}
                                </p>
                                {order.quantity > 1 && (
                                    <p className="order-quantity">Quantity: {order.quantity}</p>
                                )}
                                {order.specialRequest && order.specialRequest.trim() && (
                                    <p className="special-request">
                                        <FiAlertCircle className="warning-icon" />
                                        Request: {order.specialRequest}
                                    </p>
                                )}
                            </div>
                            <div className={`order-status ${getStatusClass(order.status)}`}>
                                {getStatusIcon(order.status)}
                                <span>{order.status.replace('_', ' ')}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}