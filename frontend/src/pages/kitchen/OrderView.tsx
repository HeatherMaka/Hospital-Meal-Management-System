// src/pages/kitchen/OrderView.tsx
import { useState, useEffect, useCallback } from 'react'
import { api } from '../../services/api'  // Use shared axios instance
import {
    FiClock, FiCheckCircle, FiPackage, FiAlertCircle, FiSearch,
    FiFilter, FiRefreshCw, FiX
} from 'react-icons/fi'
import '../../styles/pages/kitchen/OrderView.css'

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
    mealType: 'BREAKFAST' | 'LUNCH' | 'SUPPER'
    orderDate: string           // ISO date "YYYY-MM-DD" (backend field name)
    quantity: number
    specialRequest?: string | null
    status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'DELIVERED' | 'CANCELLED'  //  Use CONFIRMED not READY
    orderedAt: string           // ISO datetime (backend: createdAt)
    updatedAt?: string
}

type NotificationType = 'success' | 'error' | 'info'

interface Notification {
    message: string
    type: NotificationType
}

// ============ Main Component ============
export default function OrderView() {
    const [orders, setOrders] = useState<Order[]>([])
    const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
    const [selectedMealType, setSelectedMealType] = useState<string>('ALL')
    const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [isLoading, setIsLoading] = useState(true)
    const [isUpdating, setIsUpdating] = useState<number | null>(null)
    const [notification, setNotification] = useState<Notification | null>(null)

    // Show notification toast
    const showNotification = (message: string, type: NotificationType) => {
        setNotification({ message, type })
        setTimeout(() => setNotification(null), 4000)
    }

    //  Fetch orders from backend - GET /api/staff/orders?date=...&mealType=...
    const fetchOrders = useCallback(async (date: string, mealType?: string) => {
        try {
            setIsLoading(true)

            const params: Record<string, string> = { date }
            if (mealType && mealType !== 'ALL') {
                params.mealType = mealType
            }

            const response = await api.get<Order[]>('/staff/orders', { params })
            setOrders(response.data || [])

        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch orders'
            // 403 is expected if user doesn't have STAFF/KITCHEN_STAFF role
            if (err.response?.status === 403) {
                showNotification('Access denied: Staff role required', 'error')
            } else {
                showNotification(errorMessage, 'error')
            }
            console.error('Error fetching orders:', err)
            setOrders([])
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Load orders when date or mealType filter changes
    useEffect(() => {
        fetchOrders(selectedDate, selectedMealType === 'ALL' ? undefined : selectedMealType)
    }, [selectedDate, selectedMealType, fetchOrders])

    // Filter orders based on search and status (client-side filtering)
    useEffect(() => {
        let filtered = orders

        // Status filter
        if (selectedStatus !== 'ALL') {
            filtered = filtered.filter((o) => o.status === selectedStatus)
        }

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase()
            filtered = filtered.filter(
                (o) =>
                    o.patientName?.toLowerCase().includes(term) ||
                    o.wardNumber?.toLowerCase().includes(term) ||
                    o.bedNumber?.toLowerCase().includes(term) ||
                    o.mealName?.toLowerCase().includes(term)
            )
        }

        setFilteredOrders(filtered)
    }, [orders, selectedStatus, searchTerm])

    //  Handle status update - PATCH /api/staff/orders/{id}/status?status=...
    const handleStatusUpdate = async (orderId: number, newStatus: Order['status']) => {
        if (isUpdating !== null) return // Prevent double-clicks

        setIsUpdating(orderId)
        try {
            //  Correct endpoint with query param
            await api.patch<Order>(`/staff/orders/${orderId}/status`, null, {
                params: { status: newStatus }
            })

            showNotification(`Order #${orderId} marked as ${newStatus}`, 'success')

            // Optimistic update + refetch to ensure consistency
            setOrders(prev =>
                prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
            )

            // Refetch to get any server-side updates
            await fetchOrders(selectedDate, selectedMealType === 'ALL' ? undefined : selectedMealType)

        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || `Failed to update order status`
            showNotification(errorMessage, 'error')
            console.error('Error updating order status:', err)
            // Revert optimistic update on error
            await fetchOrders(selectedDate, selectedMealType === 'ALL' ? undefined : selectedMealType)
        } finally {
            setIsUpdating(null)
        }
    }

    // Handle cancel order
    const handleCancelOrder = async (orderId: number) => {
        if (!window.confirm('Are you sure you want to cancel this order?')) return
        await handleStatusUpdate(orderId, 'CANCELLED')
    }

    // Manual refresh handler
    const handleRefresh = () => {
        fetchOrders(selectedDate, selectedMealType === 'ALL' ? undefined : selectedMealType)
        showNotification('Refreshing orders...', 'info')
    }

    // Get icon for status badge
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PENDING': return <FiClock />
            case 'CONFIRMED': return <FiAlertCircle />  //  Use CONFIRMED
            case 'PREPARING': return <FiPackage />
            case 'DELIVERED': return <FiCheckCircle />
            case 'CANCELLED': return <FiX />
            default: return <FiClock />
        }
    }

    // ✅ Get next valid status in workflow (use CONFIRMED not READY)
    const getNextStatus = (currentStatus: string): Order['status'] | null => {
        switch (currentStatus) {
            case 'PENDING': return 'CONFIRMED'    //  Changed from READY
            case 'CONFIRMED': return 'PREPARING'  //  Added this step
            case 'PREPARING': return 'DELIVERED'
            default: return null
        }
    }

    // Format date for display
    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString)
            return date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        } catch {
            return dateString
        }
    }

    // Calculate summary counts from filtered orders
    const summaryCounts = {
        pending: filteredOrders.filter((o) => o.status === 'PENDING').length,
        confirmed: filteredOrders.filter((o) => o.status === 'CONFIRMED').length,  //  Added
        preparing: filteredOrders.filter((o) => o.status === 'PREPARING').length,
        delivered: filteredOrders.filter((o) => o.status === 'DELIVERED').length,
    }

    return (
        <div className="order-view">
            {/* Notification Toast */}
            {notification && (
                <div className={`notification-toast ${notification.type}`}>
                    {notification.type === 'error' && <FiAlertCircle />}
                    {notification.message}
                    <button className="notification-close" onClick={() => setNotification(null)} type="button">
                        <FiX />
                    </button>
                </div>
            )}

            <div className="page-header">
                <h1>Order Management</h1>
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

            <div className="filters-section">
                <div className="search-bar">
                    <FiSearch />
                    <input
                        type="text"
                        placeholder="Search by patient, ward, bed, or meal..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button className="search-clear" onClick={() => setSearchTerm('')} type="button">
                            <FiX />
                        </button>
                    )}
                </div>

                <div className="filter-buttons">
                    <div className="filter-group">
                        <FiFilter />
                        <select value={selectedMealType} onChange={(e) => setSelectedMealType(e.target.value)}>
                            <option value="ALL">All Meals</option>
                            <option value="BREAKFAST">Breakfast</option>
                            <option value="LUNCH">Lunch</option>
                            <option value="SUPPER">Supper</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <FiFilter />
                        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                            <option value="ALL">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="CONFIRMED">Confirmed</option>  {/*  Added */}
                            <option value="PREPARING">Preparing</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Orders Summary */}
            <div className="orders-summary">
                <div className="summary-card status-pending">
                    <h3>{isLoading ? '...' : summaryCounts.pending}</h3>
                    <p>Pending</p>
                </div>
                <div className="summary-card status-confirmed">  {/*  Added */}
                    <h3>{isLoading ? '...' : summaryCounts.confirmed}</h3>
                    <p>Confirmed</p>
                </div>
                <div className="summary-card status-preparing">
                    <h3>{isLoading ? '...' : summaryCounts.preparing}</h3>
                    <p>Preparing</p>
                </div>
                <div className="summary-card status-delivered">
                    <h3>{isLoading ? '...' : summaryCounts.delivered}</h3>
                    <p>Delivered</p>
                </div>
            </div>

            {/* Orders List */}
            <div className="orders-list">
                {isLoading ? (
                    <div className="loading-state">
                        <div className="spinner-large"></div>
                        <p>Loading orders...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="no-orders">
                        <h2>No Orders Found</h2>
                        <p>
                            {searchTerm || selectedStatus !== 'ALL'
                                ? 'Try adjusting your filters'
                                : `No orders for ${new Date(selectedDate).toLocaleDateString()}`
                            }
                        </p>
                        {(searchTerm || selectedStatus !== 'ALL') && (
                            <button className="btn-secondary" onClick={() => {
                                setSearchTerm('')
                                setSelectedStatus('ALL')
                            }} type="button">
                                Clear Filters
                            </button>
                        )}
                    </div>
                ) : (
                    filteredOrders.map((order) => {
                        const nextStatus = getNextStatus(order.status)
                        const isProcessing = isUpdating === order.id

                        return (
                            <div
                                key={order.id}
                                className={`order-card status-${order.status.toLowerCase()} ${isProcessing ? 'processing' : ''}`}
                            >
                                <div className="order-header">
                                    <div className="order-patient">
                                        <h3>{order.patientName}</h3>
                                        <p className="patient-location">
                                            Ward {order.wardNumber} • Bed {order.bedNumber}
                                        </p>
                                        {/*  Backend may send dietaryType via patient */}
                                        {order.specialRequest && (
                                            <span className="dietary-badge">
                        <FiAlertCircle /> Special request
                      </span>
                                        )}
                                    </div>
                                    <div className={`order-status-badge ${order.status.toLowerCase()}`}>
                                        {getStatusIcon(order.status)}
                                        <span>{order.status.replace('_', ' ')}</span>
                                    </div>
                                </div>

                                <div className="order-details">
                                    <div className="order-meal">
                                        <strong>Meal:</strong> {order.mealName}
                                        <span className="meal-type-badge">{order.mealType}</span>
                                    </div>
                                    <div className="order-time">
                                        <strong>Ordered:</strong> {formatDate(order.orderedAt)}
                                    </div>
                                    {order.quantity > 1 && (
                                        <div className="order-quantity">
                                            <strong>Quantity:</strong> {order.quantity}
                                        </div>
                                    )}
                                    {order.specialRequest && order.specialRequest.trim() && (
                                        <div className="order-special-request">
                                            <FiAlertCircle className="warning-icon" />
                                            <span>{order.specialRequest}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="order-actions">
                                    {nextStatus && order.status !== 'CANCELLED' && (
                                        <button
                                            className="btn-status-update"
                                            onClick={() => handleStatusUpdate(order.id, nextStatus)}
                                            disabled={isProcessing}
                                            type="button"
                                        >
                                            {isProcessing ? (
                                                <span className="spinner-small"></span>
                                            ) : (
                                                <>Mark as {nextStatus}</>
                                            )}
                                        </button>
                                    )}
                                    {order.status === 'PENDING' && (
                                        <button
                                            className="btn-cancel"
                                            onClick={() => handleCancelOrder(order.id)}
                                            disabled={isProcessing}
                                            type="button"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    {order.status === 'CANCELLED' && (
                                        <span className="cancelled-label">Cancelled</span>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}