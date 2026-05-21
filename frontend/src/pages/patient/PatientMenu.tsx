import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import {
    FiCalendar, FiCheck, FiAlertCircle, FiRefreshCw,
    FiClock, FiCoffee
} from 'react-icons/fi'
import '../../styles/pages/patient/PatientMenu.css'

// ============ TypeScript Interfaces ============

// Raw shape coming from backend - FLAT ARRAY of MealDTO objects
interface RawMealDTO {
    id: number
    name: string
    description: string
    mealType: MealType
    mealDate?: string
    orderDeadline?: string
    compatibleDiets: string[]
    active: boolean
    orderable: boolean
    createdById?: number
    createdByRole?: string
}

// Normalized internal shape used by the component
export interface DailyMenuItem {
    id: number
    mealName: string
    description: string
    mealType: MealType
    dietaryTypes: string[]
    isOrderable: boolean
    orderDeadline?: string
    imageUrl?: string
}

//  Backend expects 'mealId', not 'dailyMenuId'
export interface OrderRequest {
    mealId: number  // ← Changed from dailyMenuId to mealId
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
    mealType: MealType
    orderDate: string
    quantity: number
    specialRequest?: string
    status: 'PENDING' | 'READY' | 'PREPARING' | 'DELIVERED' | 'CANCELLED'
    orderedAt: string
    updatedAt?: string
}

type MealType = 'CEREAL' | 'BREAKFAST' | 'LUNCH' | 'LUNCH_DESSERT' | 'THREE_PM_TEAS' | 'DINNER' | 'DINNER_DESSERT'
type NotificationType = 'success' | 'error' | 'info'

interface Notification {
    message: string
    type: NotificationType
}

// ============ Field Mapping Helper ============

function mapRawMealToMenuItem(raw: RawMealDTO): DailyMenuItem {
    return {
        id: raw.id,
        mealName: raw.name,
        description: raw.description,
        mealType: raw.mealType,
        dietaryTypes: raw.compatibleDiets ?? [],
        isOrderable: raw.orderable,
        orderDeadline: raw.orderDeadline,
    }
}

// ============ Main Component ============
export default function PatientMenu() {
    const { user, logout } = useAuth()

    const [selectedDate, setSelectedDate] = useState(
        new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
            .toISOString().split('T')[0]
    )
    const [selectedMeals, setSelectedMeals] = useState<number[]>([])
    const [specialRequest, setSpecialRequest] = useState('')
    const [menuItems, setMenuItems] = useState<DailyMenuItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [notification, setNotification] = useState<Notification | null>(null)
    const [orderHistory, setOrderHistory] = useState<OrderDTO[]>([])
    const [showOrderHistory, setShowOrderHistory] = useState(false)

    // ── Fetch menu ──────────────────────────────────────────────────────────────
    const fetchMenu = async (date: string) => {
        try {
            setIsLoading(true)

            const response = await api.get<RawMealDTO[]>('/patient/menu', { params: { date } })
            const meals = response.data ?? []

            console.debug('Raw backend response (flat array):', meals)
            console.debug(`Found ${meals.length} meals from backend`)

            const allItems: DailyMenuItem[] = meals.map(rawMeal => mapRawMealToMenuItem(rawMeal))

            console.debug(`Mapped ${allItems.length} menu items for ${date}:`, allItems)

            setMenuItems(allItems)
            setSelectedMeals([])
            setSpecialRequest('')

        } catch (err: any) {
            console.error('Error fetching menu:', err)
            const errorMessage = err.response?.data?.message || err.message || 'Failed to load menu'
            showNotification(errorMessage, 'error')
            setMenuItems([])

            if (err.response?.status === 401 || err.response?.status === 403) {
                logout()
            }
        } finally {
            setIsLoading(false)
        }
    }

    // ── Fetch order history ─────────────────────────────────────────────────────
    const fetchOrderHistory = async (date?: string) => {
        try {
            const params = date ? { date } : undefined
            const response = await api.get<OrderDTO[]>('/patient/orders', { params })
            setOrderHistory(Array.isArray(response.data) ? response.data : [])
        } catch (err: any) {
            console.error('Error fetching order history:', err)
        }
    }

    useEffect(() => {
        fetchMenu(selectedDate)
        fetchOrderHistory()
    }, [selectedDate])

    // ── Helpers ─────────────────────────────────────────────────────────────────
    const showNotification = (message: string, type: NotificationType): void => {
        setNotification({ message, type })
        setTimeout(() => setNotification(null), 4000)
    }

    const handleMealToggle = (mealId: number): void => {
        const meal = menuItems.find(m => m.id === mealId)
        if (!meal?.isOrderable) return
        setSelectedMeals(prev =>
            prev.includes(mealId)
                ? prev.filter(id => id !== mealId)
                : [...prev, mealId]
        )
    }

    // ── Submit order ────────────────────────────────────────────────────────────
    const handleSubmitOrder = async (): Promise<void> => {
        if (selectedMeals.length === 0) {
            showNotification('Please select at least one meal', 'error')
            return
        }

        setIsSubmitting(true)
        let successCount = 0
        let lastError = ''

        for (const mealId of selectedMeals) {
            try {
                const order: OrderRequest = {
                    mealId: mealId,
                    quantity: 1,
                    specialRequest: specialRequest.trim() || undefined,
                }
                await api.post<OrderDTO>('/patient/orders', order)
                successCount++
            } catch (err: any) {
                const msg = err.response?.data?.message || err.message || 'Failed to submit order'
                lastError = msg
                console.error(`Error submitting meal #${mealId}:`, msg)
            }
        }

        if (successCount > 0) {
            showNotification(
                `${successCount} meal(s) ordered successfully.` +
                (successCount < selectedMeals.length ? ` ${selectedMeals.length - successCount} failed.` : ''),
                lastError ? 'error' : 'success'
            )
            setSelectedMeals([])
            setSpecialRequest('')
            await fetchOrderHistory()
        } else {
            showNotification(lastError || 'Failed to submit order', 'error')
        }

        setIsSubmitting(false)
    }

    const handleRefresh = (): void => {
        fetchMenu(selectedDate)
        showNotification('Refreshing menu...', 'info')
    }

    const formatDate = (dateString: string): string => {
        const localDateString = dateString.includes('T') ? dateString : `${dateString}T00:00:00`
        return new Date(localDateString).toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric'
        })
    }

    const formatTime = (timeString?: string): string => {
        if (!timeString) return ''
        return timeString.length > 5 ? timeString.substring(0, 5) : timeString
    }

    const getMealTypeIcon = (mealType: string): string => {
        switch (mealType) {
            case 'CEREAL':         return ''
            case 'BREAKFAST':      return ''
            case 'LUNCH':          return ''
            case 'LUNCH_DESSERT':  return ''
            case 'THREE_PM_TEAS':  return ''
            case 'DINNER':         return ''
            case 'DINNER_DESSERT': return ''
            default:               return ''
        }
    }

    const getMealTypeLabel = (mealType: string): string => {
        switch (mealType) {
            case 'CEREAL':         return 'Cereal'
            case 'BREAKFAST':      return 'Breakfast'
            case 'LUNCH':          return 'Lunch'
            case 'LUNCH_DESSERT':  return 'Lunch Dessert'
            case 'THREE_PM_TEAS':  return '3PM Teas'
            case 'DINNER':         return 'Dinner'
            case 'DINNER_DESSERT': return 'Dinner Dessert'
            default:               return mealType
        }
    }

    const getOrderStatusClass = (status: string): string => {
        const classes: Record<string, string> = {
            PENDING:   'badge-pending',
            READY:     'badge-ready',
            PREPARING: 'badge-preparing',
            DELIVERED: 'badge-delivered',
            CANCELLED: 'badge-cancelled',
        }
        return classes[status] || 'badge-default'
    }

    const MEAL_TYPE_ORDER: MealType[] = [
        'CEREAL', 'BREAKFAST', 'LUNCH', 'LUNCH_DESSERT',
        'THREE_PM_TEAS', 'DINNER', 'DINNER_DESSERT'
    ]

    // ── Render ──────────────────────────────────────────────────────────────────
    return (
        <div className="patient-menu">
            {/* Notification Toast */}
            {notification && (
                <div className={`notification-toast ${notification.type}`}>
                    {notification.type === 'error'   && <FiAlertCircle />}
                    {notification.type === 'success' && <FiCheck />}
                    {notification.message}
                    <button
                        className="notification-close"
                        onClick={() => setNotification(null)}
                        type="button"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="menu-header">
                <div>
                    <h1>Welcome, {user?.fullName || user?.name || user?.username || 'Patient'}! </h1>
                    <p className="header-subtitle">Select your meals from the kitchen offerings</p>
                </div>
                <div className="header-actions">
                    <button
                        className={`btn-toggle ${showOrderHistory ? 'active' : ''}`}
                        onClick={() => setShowOrderHistory(!showOrderHistory)}
                        type="button"
                    >
                        {showOrderHistory ? 'View Menu' : 'Order History'}
                    </button>
                    <button
                        className="btn-refresh"
                        onClick={handleRefresh}
                        disabled={isLoading}
                        type="button"
                    >
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
                    min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
                        .toISOString().split('T')[0]}
                    max={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                        .toISOString().split('T')[0]}
                />
                <span className="selected-date-display">{formatDate(selectedDate)}</span>
            </div>

            {/* Order History */}
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
                                            {getMealTypeIcon(order.mealType)} {getMealTypeLabel(order.mealType)}
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
                /* Menu Selection */
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
                            <p>
                                Kitchen staff haven't added meals for {formatDate(selectedDate)} yet.
                                Check back later!
                            </p>
                        </div>
                    ) : (
                        MEAL_TYPE_ORDER.map((mealType) => {
                            const meals = menuItems.filter(m => m.mealType === mealType)
                            if (meals.length === 0) return null

                            return (
                                <div key={mealType} className="meal-type-section">
                                    <div className="meal-type-header">
                                        <h2>
                                            <span className="meal-type-icon">{getMealTypeIcon(mealType)}</span>
                                            {getMealTypeLabel(mealType)}
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

                                                    {meal.dietaryTypes.length > 0 && (
                                                        <div className="dietary-tags">
                                                            {meal.dietaryTypes.map((type) => (
                                                                <span key={type} className="dietary-tag">
                                                                    {type.replace(/_/g, ' ')}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {meal.orderDeadline && !meal.isOrderable && (
                                                        <div className="deadline-notice">
                                                            <FiClock />
                                                            <span>
                                                                Ordering closed at {formatTime(meal.orderDeadline)}
                                                            </span>
                                                        </div>
                                                    )}

                                                    {meal.orderDeadline && meal.isOrderable && (
                                                        <div className="deadline-notice open">
                                                            <FiClock />
                                                            <span>
                                                                Order by {formatTime(meal.orderDeadline)}
                                                            </span>
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

                    {/* Special Request */}
                    <div className="special-request-section">
                        <h3>Special Requests</h3>
                        <textarea
                            placeholder="Any allergies, preferences, or special instructions? (Optional)"
                            value={specialRequest}
                            onChange={(e) => setSpecialRequest(e.target.value)}
                            rows={3}
                            maxLength={500}
                        />
                        <small className="char-count">{specialRequest.length}/500 characters</small>
                    </div>

                    {/* Order Summary */}
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

                    {/* Submit */}
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