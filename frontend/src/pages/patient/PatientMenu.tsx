// src/pages/patient/PatientMenu.tsx
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'  //Use shared axios instance
import {
    FiCalendar, FiCheck, FiAlertCircle, FiRefreshCw,
    FiClock, FiCoffee
} from 'react-icons/fi'
import '../../styles/pages/patient/PatientMenu.css'

// ============ TypeScript Interfaces (Match Backend DTOs) ============

// Backend DailyMenuDTO: { date: string, mealType: string, items: MealDTO[] }
export interface DailyMenu {
    date: string              // ISO date "YYYY-MM-DD"
    mealType: 'BREAKFAST' | 'LUNCH' | 'SUPPER'
    items: DailyMenuItem[]
}

export interface DailyMenuItem {
    id: number                // This is the DailyMenu ID (for ordering)
    mealName: string          // Backend sends 'name', we map to 'mealName'
    description: string
    mealType: 'BREAKFAST' | 'LUNCH' | 'SUPPER'
    dietaryTypes: string[]    // Backend: compatibleDiets (enum array)
    isOrderable: boolean      // Derived from isActive + orderDeadline
    orderDeadline?: string    // ISO time "HH:mm:ss"
    imageUrl?: string
}

export interface OrderRequest {
    dailyMenuId: number       // ID of the DailyMenu entry
    quantity?: number
    specialRequest?: string
}

export interface OrderDTO {
    id: number
    patientId: number
    patientName: string
    wardNumber: string
    bedNumber: string
    mealId: number
    mealName: string
    mealType: 'BREAKFAST' | 'LUNCH' | 'SUPPER'
    orderDate: string         // ISO date
    quantity: number
    specialRequest?: string
    status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'DELIVERED' | 'CANCELLED'
    orderedAt: string         // ISO datetime (backend: createdAt)
    updatedAt?: string
}

type NotificationType = 'success' | 'error' | 'info'
interface Notification {
    message: string
    type: NotificationType
}

// ============ Main Component ============
export default function PatientMenu() {
    const { user, logout } = useAuth()

    // State
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [selectedMeals, setSelectedMeals] = useState<number[]>([]) // DailyMenu IDs
    const [specialRequest, setSpecialRequest] = useState('')
    const [menuItems, setMenuItems] = useState<DailyMenuItem[]>([])  // Flattened items
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [notification, setNotification] = useState<Notification | null>(null)
    const [orderHistory, setOrderHistory] = useState<OrderDTO[]>([])
    const [showOrderHistory, setShowOrderHistory] = useState(false)

    //  Fetch menu for selected date using shared api helper
    const fetchMenu = async (date: string) => {
        try {
            setIsLoading(true)

            // Backend returns: DailyMenuDTO[] = [{ date, mealType, items: [...] }, ...]
            const dailyMenus = await api.get<DailyMenu[]>(`/patient/menu`, {
                params: { date }
            }).then(res => res.data)

            //  Flatten all items from all meal types into single array
            const allItems = dailyMenus.flatMap(menu =>
                menu.items.map(item => ({
                    ...item,
                    // ✅ Map backend 'name' to frontend 'mealName' if needed
                    mealName: item.mealName || (item as any).name,
                    // ✅ Map backend 'compatibleDiets' to 'dietaryTypes' if needed
                    dietaryTypes: item.dietaryTypes || (item as any).compatibleDiets || [],
                    // ✅ Derive isOrderable if not provided
                    isOrderable: item.isOrderable ?? (
                        item.orderDeadline
                            ? new Date(`1970-01-01T${item.orderDeadline}`) > new Date()
                            : true
                    )
                }))
            )

            console.debug(` Loaded ${allItems.length} menu items for ${date}`)
            setMenuItems(allItems)
            setSelectedMeals([])
            setSpecialRequest('')

        } catch (err: any) {
            console.error(' Error fetching menu:', err)
            const errorMessage = err.response?.data?.message || err.message || 'Failed to load menu'
            showNotification(errorMessage, 'error')
            setMenuItems([])

            // Auto-logout on auth errors
            if (err.response?.status === 401 || err.response?.status === 403) {
                logout()
            }
        } finally {
            setIsLoading(false)
        }
    }

    //  Fetch order history using shared api helper
    const fetchOrderHistory = async (date?: string) => {
        try {
            const params = date ? { date } : undefined
            const data = await api.get<OrderDTO[]>(`/patient/orders`, { params })
                .then(res => res.data)
            setOrderHistory(Array.isArray(data) ? data : [])
        } catch (err: any) {
            console.error('Error fetching order history:', err)
            // Don't auto-logout for non-auth errors in order history
        }
    }

    // Initial load
    useEffect(() => {
        fetchMenu(selectedDate)
        fetchOrderHistory()
    }, [selectedDate])

    // Notification helper
    const showNotification = (message: string, type: NotificationType): void => {
        setNotification({ message, type })
        setTimeout(() => setNotification(null), 4000)
    }

    // Handle meal selection toggle
    const handleMealToggle = (mealId: number): void => {
        const meal = menuItems.find(m => m.id === mealId)
        if (!meal?.isOrderable) return
        setSelectedMeals(prev =>
            prev.includes(mealId)
                ? prev.filter(id => id !== mealId)
                : [...prev, mealId]
        )
    }

    //  Submit order to backend using shared api helper
    const handleSubmitOrder = async (): Promise<void> => {
        if (selectedMeals.length === 0) {
            showNotification('Please select at least one meal', 'error')
            return
        }

        setIsSubmitting(true)
        try {
            // Each selected meal becomes an order
            const orders = selectedMeals.map(mealId => ({
                dailyMenuId: mealId,  // This is the DailyMenu ID from backend
                quantity: 1,
                specialRequest: specialRequest.trim() || undefined,
            } as OrderRequest))

            // Submit each order individually
            for (const order of orders) {
                await api.post<OrderDTO>('/patient/orders', order)
            }

            showNotification(`Order submitted successfully! ${selectedMeals.length} meal(s) ordered.`, 'success')
            setSelectedMeals([])
            setSpecialRequest('')
            await fetchOrderHistory()

        } catch (err: any) {
            console.error(' Error submitting order:', err)
            const errorMessage = err.response?.data?.message || err.message || 'Failed to submit order'
            showNotification(errorMessage, 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Refresh menu manually
    const handleRefresh = (): void => {
        fetchMenu(selectedDate)
        showNotification('Refreshing menu...', 'info')
    }

    // Format date for display
    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric'
        })
    }

    // Format time for deadline display
    const formatTime = (timeString?: string): string => {
        if (!timeString) return ''
        // Handle both "HH:mm:ss" and "HH:mm" formats
        const time = timeString.length > 5 ? timeString.substring(0, 5) : timeString
        return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit'
        })
    }

    // Get meal type icon
    const getMealTypeIcon = (mealType: string) => {
        switch (mealType) {
            case 'BREAKFAST': return '🌅'
            case 'LUNCH': return '☀️'
            case 'SUPPER': return '🌙'
            default: return '🍽️'
        }
    }

    // Get order status badge class
    const getOrderStatusClass = (status: string): string => {
        const classes: Record<string, string> = {
            'PENDING': 'badge-pending',
            'CONFIRMED': 'badge-confirmed',
            'PREPARING': 'badge-preparing',
            'DELIVERED': 'badge-delivered',
            'CANCELLED': 'badge-cancelled'
        }
        return classes[status] || 'badge-default'
    }

    return (
        <div className="patient-menu">
            {/* Notification Toast */}
            {notification && (
                <div className={`notification-toast ${notification.type}`}>
                    {notification.type === 'error' && <FiAlertCircle />}
                    {notification.type === 'success' && <FiCheck />}
                    {notification.message}
                    <button className="notification-close" onClick={() => setNotification(null)} type="button">
                        ×
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="menu-header">
                <div>
                    <h1>Welcome, {user?.fullName || user?.name || user?.username || 'Patient'}! 👋</h1>
                    <p className="header-subtitle">Select your meals from today's kitchen offerings</p>
                </div>
                <div className="header-actions">
                    <button
                        className={`btn-toggle ${showOrderHistory ? 'active' : ''}`}
                        onClick={() => setShowOrderHistory(!showOrderHistory)}
                        type="button"
                    >
                        {showOrderHistory ? ' View Menu' : ' Order History'}
                    </button>
                    <button className="btn-refresh" onClick={handleRefresh} disabled={isLoading} type="button">
                        <FiRefreshCw className={isLoading ? 'spinning' : ''} />
                    </button>
                </div>
            </div>

            {/* Date Selector */}
            <div className="date-selector">
                <FiCalendar />
                <label>Select Date:</label>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    max={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                />
                <span className="selected-date-display">{formatDate(selectedDate)}</span>
            </div>

            {/* Order History Section */}
            {showOrderHistory ? (
                <div className="order-history-section slide-in">
                    <div className="section-header">
                        <h2><FiClock /> Your Orders</h2>
                        <span className="order-count">{orderHistory.length} order(s)</span>
                    </div>

                    {orderHistory.length === 0 ? (
                        <div className="empty-orders">
                            <FiCoffee className="empty-icon" />
                            <p>No orders yet. Start by selecting meals from the menu!</p>
                        </div>
                    ) : (
                        <div className="orders-list">
                            {orderHistory.map((order) => (
                                <div key={order.id} className="order-card">
                                    <div className="order-header">
                    <span className="order-meal-type">
                      {getMealTypeIcon(order.mealType)} {order.mealType}
                    </span>
                                        <span className={`badge ${getOrderStatusClass(order.status)}`}>
                      {order.status}
                    </span>
                                    </div>
                                    <h3>{order.mealName}</h3>
                                    {order.specialRequest && (
                                        <p className="special-request-display">
                                            <strong>Note:</strong> {order.specialRequest}
                                        </p>
                                    )}
                                    <div className="order-meta">
                                        <span>Ordered: {formatDate(order.orderedAt)}</span>
                                        <span>#{order.id}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* Menu Selection Section */
                <div className="menu-selection-section">
                    {isLoading ? (
                        <div className="loading-state">
                            <div className="spinner-large"></div>
                            <p>Loading today's menu from kitchen...</p>
                        </div>
                    ) : menuItems.length === 0 ? (
                        <div className="empty-menu">
                            <FiAlertCircle className="empty-icon" />
                            <h3>No meals available</h3>
                            <p>Kitchen staff haven't added meals for {formatDate(selectedDate)} yet. Check back later!</p>
                        </div>
                    ) : (
                        ['BREAKFAST', 'LUNCH', 'SUPPER'].map((mealType) => {
                            const meals = menuItems.filter(m => m.mealType === mealType)
                            if (meals.length === 0) return null

                            return (
                                <div key={mealType} className="meal-type-section">
                                    <div className="meal-type-header">
                                        <h2>
                                            <span className="meal-type-icon">{getMealTypeIcon(mealType)}</span>
                                            {mealType.charAt(0) + mealType.slice(1).toLowerCase()}
                                        </h2>
                                        {meals.every(m => !m.isOrderable) && (
                                            <span className="ordering-closed">Ordering Closed</span>
                                        )}
                                    </div>

                                    <div className="meals-grid">
                                        {meals.map((meal) => (
                                            <div
                                                key={meal.id}
                                                className={`meal-card ${
                                                    selectedMeals.includes(meal.id) ? 'selected' : ''
                                                } ${!meal.isOrderable ? 'disabled' : ''}`}
                                                onClick={() => meal.isOrderable && handleMealToggle(meal.id)}
                                                role="button"
                                                tabIndex={meal.isOrderable ? 0 : -1}
                                                onKeyDown={(e) => {
                                                    if ((e.key === 'Enter' || e.key === ' ') && meal.isOrderable) {
                                                        e.preventDefault()
                                                        handleMealToggle(meal.id)
                                                    }
                                                }}
                                            >
                                                <div className="meal-content">
                                                    <div className="meal-header">
                                                        <h3>{meal.mealName}</h3>
                                                        {selectedMeals.includes(meal.id) && (
                                                            <div className="selection-indicator">
                                                                <FiCheck />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <p className="meal-description">{meal.description}</p>

                                                    {meal.dietaryTypes?.length > 0 && (
                                                        <div className="dietary-tags">
                                                            {meal.dietaryTypes.map((type) => (
                                                                <span key={type} className="dietary-tag">
                                  {type}
                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {meal.orderDeadline && !meal.isOrderable && (
                                                        <div className="deadline-notice">
                                                            <FiClock />
                                                            <span>Ordering closed at {formatTime(meal.orderDeadline)}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {!meal.isOrderable && (
                                                    <div className="unavailable-overlay">
                                                        <FiAlertCircle />
                                                        <span>Not Available</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })
                    )}

                    {/* Special Request Section */}
                    <div className="special-request-section">
                        <h3> Special Requests</h3>
                        <textarea
                            placeholder="Any allergies, preferences, or special instructions? (Optional)"
                            value={specialRequest}
                            onChange={(e) => setSpecialRequest(e.target.value)}
                            rows={3}
                            maxLength={500}
                        />
                        <small className="char-count">{specialRequest.length}/500 characters</small>
                    </div>

                    {/* Order Summary & Submit */}
                    {selectedMeals.length > 0 && (
                        <div className="order-summary">
                            <div className="summary-header">
                                <h3>Order Summary</h3>
                                <span className="item-count">{selectedMeals.length} item(s)</span>
                            </div>
                            <ul className="summary-items">
                                {selectedMeals.map(mealId => {
                                    const meal = menuItems.find(m => m.id === mealId)
                                    if (!meal) return null
                                    return (
                                        <li key={mealId}>
                                            <span>{getMealTypeIcon(meal.mealType)}</span>
                                            <span>{meal.mealName}</span>
                                        </li>
                                    )
                                })}
                            </ul>
                            {specialRequest && (
                                <p className="summary-note">
                                    <strong>Note:</strong> {specialRequest}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="order-actions">
                        <button
                            className="btn-submit"
                            onClick={handleSubmitOrder}
                            disabled={isSubmitting || selectedMeals.length === 0}
                            type="button"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="spinner-small"></span>
                                    Submitting...
                                </>
                            ) : (
                                `Submit Order (${selectedMeals.length} item${selectedMeals.length !== 1 ? 's' : ''})`
                            )}
                        </button>
                        {selectedMeals.length > 0 && (
                            <button
                                className="btn-clear"
                                onClick={() => setSelectedMeals([])}
                                disabled={isSubmitting}
                                type="button"
                            >
                                Clear Selection
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}