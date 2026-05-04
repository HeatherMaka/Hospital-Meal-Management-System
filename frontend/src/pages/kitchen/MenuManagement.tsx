// src/pages/kitchen/MenuManagement.tsx
import { useState, useEffect } from 'react'
import { api } from '../../services/api'  //  Use shared axios instance
import {
    FiPlus, FiEdit, FiTrash2, FiCalendar, FiX, FiSave, FiAlertCircle, FiRefreshCw
} from 'react-icons/fi'
import '../../styles/pages/kitchen/MenuManagement.css'

//  Updated to use 7 meal types
type MealType = 'CEREAL' | 'BREAKFAST' | 'LUNCH' | 'LUNCH_DESSERT' | 'THREE_PM_TEAS' | 'DINNER' | 'DINNER_DESSERT'

// Backend MealDTO
export interface Meal {
    id: number
    name: string
    description: string
    mealType: MealType
    compatibleDiets: string[]  //  Backend field name (not dietaryTypes)
    isActive: boolean
    mealDate?: string          // ISO date "YYYY-MM-DD"
    orderDeadline?: string     // ISO time "HH:mm:ss"
    createdAt?: string
    updatedAt?: string
}

// Backend DailyMenuDTO: { date, mealType, items[] }
export interface DailyMenuDTO {
    date: string              // ISO date "YYYY-MM-DD"
    mealType: MealType
    items: Meal[]             // Array of meals for this type
}

// Request to add meals to daily menu (matches backend DailyMenuRequest)
export interface DailyMenuRequest {
    menuDate: string          // ISO date
    mealType: MealType
    meals: MealItemRequest[]
}

export interface MealItemRequest {
    name: string
    description: string
    compatibleDiets?: string[]
    orderDeadline?: string    // "HH:mm:ss"
}

export interface MealFormData {
    name: string
    description: string
    mealType: MealType
    compatibleDiets: string[]  //  Match backend field name
    orderDeadline?: string
}

type ModalMode = 'create' | 'edit' | 'add-to-menu' | null
type NotificationType = 'success' | 'error' | 'info'

interface Notification {
    message: string
    type: NotificationType
}

// ============ Main Component ============
export default function MenuManagement() {
    const [meals, setMeals] = useState<Meal[]>([])
    const [dailyMenus, setDailyMenus] = useState<DailyMenuDTO[]>([])  //  Match backend structure
    const [selectedDate, setSelectedDate] = useState(new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0])
    const [selectedMealType, setSelectedMealType] = useState<'CEREAL' | 'BREAKFAST' | 'LUNCH' | 'LUNCH_DESSERT' | 'THREE_PM_TEAS' | 'DINNER' | 'DINNER_DESSERT'>('LUNCH')
    const [showMealModal, setShowMealModal] = useState(false)
    const [showMenuModal, setShowMenuModal] = useState(false)
    const [modalMode, setModalMode] = useState<ModalMode>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [notification, setNotification] = useState<Notification | null>(null)

    // Form state
    const [formData, setFormData] = useState<MealFormData>({
        name: '',
        description: '',
        mealType: 'LUNCH',
        compatibleDiets: [],
        orderDeadline: '',
    })

    // Show notification toast
    const showNotification = (message: string, type: NotificationType) => {
        setNotification({ message, type })
        setTimeout(() => setNotification(null), 4000)
    }

    //  Fetch meals from backend - GET /api/meals
    const fetchMeals = async () => {
        try {
            const response = await api.get<Meal[]>('/meals')
            setMeals(response.data || [])
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch meals'
            showNotification(errorMessage, 'error')
            console.error('Error fetching meals:', err)
        }
    }

    // Fetch daily menu for selected date - GET /api/staff/menu?date=...
    const fetchDailyMenu = async (date: string) => {
        try {
            const response = await api.get<DailyMenuDTO[]>('/staff/menu', { params: { date } })
            setDailyMenus(response.data || [])
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch daily menu'
            // 403 is expected if user doesn't have STAFF/KITCHEN_STAFF role
            if (err.response?.status === 403) {
                showNotification('Access denied: Staff role required', 'error')
            } else {
                showNotification(errorMessage, 'error')
            }
            console.error('Error fetching daily menu:', err)
        }
    }

    // Load data on mount and when date changes
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true)
            try {
                await Promise.all([
                    fetchMeals(),
                    fetchDailyMenu(selectedDate)
                ])
            } finally {
                setIsLoading(false)
            }
        }
        loadData()
    }, [selectedDate])

    // Handle form input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    // Handle checkbox changes for dietary types (compatibleDiets)
    const handleDietaryChange = (diet: string) => {
        setFormData(prev => ({
            ...prev,
            compatibleDiets: prev.compatibleDiets.includes(diet)
                ? prev.compatibleDiets.filter(d => d !== diet)
                : [...prev.compatibleDiets, diet]
        }))
    }

    // Open modal for creating new meal
    const handleCreateMeal = () => {
        setModalMode('create')
        setEditingMealId(null)
        setFormData({
            name: '',
            description: '',
            mealType: 'LUNCH',
            compatibleDiets: [],
            orderDeadline: '',
        })
        setShowMealModal(true)
    }

    // Open modal for editing meal
    const handleEditMeal = (meal: Meal) => {
        setModalMode('edit')
        setEditingMealId(meal.id)
        setFormData({
            name: meal.name,
            description: meal.description,
            mealType: meal.mealType,
            compatibleDiets: meal.compatibleDiets || [],
            orderDeadline: meal.orderDeadline || '',
        })
        setShowMealModal(true)
    }

    // Open modal for adding to daily menu
    const handleAddToMenuModal = () => {
        setModalMode('add-to-menu')
        setShowMenuModal(true)
    }

    // Close modals
    const handleCloseMealModal = () => {
        setShowMealModal(false)
        setModalMode(null)
        setEditingMealId(null)
    }

    const handleCloseMenuModal = () => {
        setShowMenuModal(false)
        setModalMode(null)
    }

    //  Handle meal form submission (Create or Update) - POST/PUT /api/meals
    const handleSubmitMeal = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            //  Map frontend field names to backend expectations
            const payload = {
                name: formData.name,
                description: formData.description,
                mealType: formData.mealType,
                compatibleDiets: formData.compatibleDiets,  //  Backend expects this field name
                orderDeadline: formData.orderDeadline || null,
            }

            if (modalMode === 'create') {
                // POST /api/meals
                await api.post<Meal>('/meals', payload)
                showNotification('Meal created successfully', 'success')
            } else if (modalMode === 'edit' && editingMealId) {
                // PUT /api/meals/{id}
                await api.put<Meal>(`/meals/${editingMealId}`, payload)
                showNotification('Meal updated successfully', 'success')
            }

            await fetchMeals()
            handleCloseMealModal()
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to save meal'
            showNotification(errorMessage, 'error')
            console.error('Error saving meal:', err)
        } finally {
            setIsSubmitting(false)
        }
    }

    //  Handle adding meal to daily menu - POST /api/staff/menu
    const handleAddToDailyMenu = async (meal: Meal) => {
        try {
            // Build request matching backend DailyMenuRequest
            const payload: DailyMenuRequest = {
                menuDate: selectedDate,
                mealType: selectedMealType,  // User selects meal type
                meals: [{
                    name: meal.name,
                    description: meal.description,
                    compatibleDiets: meal.compatibleDiets || [],
                    orderDeadline: meal.orderDeadline,
                }]
            }

            console.log('Adding to menu:', payload)
            await api.post<DailyMenuDTO>('/staff/menu', payload)
            showNotification(`${meal.name} added to ${selectedMealType} menu`, 'success')
            await fetchDailyMenu(selectedDate)
            handleCloseMenuModal()
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to add meal to menu'
            showNotification(errorMessage, 'error')
            console.error('Error adding to daily menu:', err.response?.data || err)
        }
    }

    //  Handle removing meal from daily menu - DELETE /api/staff/menu/meals/{mealId}
    const handleRemoveFromMenu = async (mealId: number) => {
        if (!window.confirm('Remove this meal from the menu?')) return

        try {
            //  Correct endpoint: /api/staff/menu/meals/{mealId}
            await api.delete(`/staff/menu/meals/${mealId}`)
            showNotification('Meal removed from menu', 'info')
            await fetchDailyMenu(selectedDate)
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to remove meal'
            showNotification(errorMessage, 'error')
            console.error('Error removing from menu:', err)
        }
    }

    //  Handle toggling meal availability - PATCH /api/meals/{id}/toggle-availability
    const handleToggleAvailability = async (mealId: number, currentStatus: boolean) => {
        try {
            //  Use correct endpoint and method
            await api.patch<Meal>(`/meals/${mealId}/toggle-availability`, {
                isActive: !currentStatus
            })
            showNotification('Availability updated', 'success')
            await Promise.all([fetchMeals(), fetchDailyMenu(selectedDate)])
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to update availability'
            showNotification(errorMessage, 'error')
            console.error('Error toggling availability:', err)
            // Revert optimistic update on error
            await fetchDailyMenu(selectedDate)
        }
    }

    //  Handle deactivating a meal - DELETE /api/meals/{id} (soft delete)
    const handleDeactivateMeal = async (mealId: number) => {
        if (!window.confirm('Deactivate this meal? It will no longer appear in the catalog.')) return

        try {
            await api.delete(`/meals/${mealId}`)
            showNotification('Meal deactivated', 'info')
            await fetchMeals()
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to deactivate meal'
            showNotification(errorMessage, 'error')
            console.error('Error deactivating meal:', err)
        }
    }

    //  Handle reactivating a meal - PATCH /api/meals/{id}/activate
    const handleReactivateMeal = async (mealId: number) => {
        try {
            await api.patch<Meal>(`/meals/${mealId}/activate`)
            showNotification('Meal reactivated', 'success')
            await fetchMeals()
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to reactivate meal'
            showNotification(errorMessage, 'error')
            console.error('Error reactivating meal:', err)
        }
    }

    // Format date for display
    const formatDate = (dateString: string) => {
        const localDateString = dateString.includes('T') ? dateString : `${dateString}T00:00:00`
        return new Date(localDateString).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })
    }

    // Format time for display
    const formatTime = (timeString?: string) => {
        if (!timeString) return ''
        const time = timeString.length > 5 ? timeString.substring(0, 5) : timeString
        return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit'
        })
    }

    // Manual refresh handler
    const handleRefresh = () => {
        setIsLoading(true)
        Promise.all([
            fetchMeals(),
            fetchDailyMenu(selectedDate)
        ]).finally(() => {
            setIsLoading(false)
            showNotification('Data refreshed', 'info')
        })
    }

    // Get meals for selected meal type from daily menu
    const getMealsForType = () => {
        const menuForDate = dailyMenus.find(m => m.mealType === selectedMealType)
        return menuForDate?.items || []
    }

    return (
        <div className="menu-management">
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
                <h1>Menu Management</h1>
                <div className="header-actions">
                    <button className="btn-refresh" onClick={handleRefresh} disabled={isLoading} title="Refresh" type="button">
                        <FiRefreshCw className={isLoading ? 'spinning' : ''} />
                    </button>
                    <button className="btn-secondary" onClick={handleCreateMeal} type="button">
                        <FiPlus /> Add New Meal
                    </button>
                    <button className="btn-primary" onClick={handleAddToMenuModal} type="button">
                        <FiCalendar /> Add to Daily Menu
                    </button>
                </div>
            </div>

            <div className="date-selector">
                <FiCalendar />
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                />
                <span className="date-display">{formatDate(selectedDate)}</span>
            </div>

            {/* Meal Type Tabs */}
            <div className="meal-type-tabs">
                {(['CEREAL', 'BREAKFAST', 'LUNCH', 'LUNCH_DESSERT', 'THREE_PM_TEAS', 'DINNER', 'DINNER_DESSERT'] as const).map(type => (
                    <button
                        key={type}
                        className={`tab-btn ${selectedMealType === type ? 'active' : ''}`}
                        onClick={() => setSelectedMealType(type)}
                        type="button"
                    >
                        {type === 'CEREAL' ? 'Cereal' :
                         type === 'BREAKFAST' ? 'Breakfast' :
                         type === 'LUNCH' ? 'Lunch' :
                         type === 'LUNCH_DESSERT' ? 'Lunch_Dessert' :
                         type === 'THREE_PM_TEAS' ? 'Three_pm_teas' :
                         type === 'DINNER' ? 'Dinner' :
                         type === 'DINNER_DESSERT' ? 'Dinner_Dessert' :
                         type.charAt(0) + type.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

            <div className="menu-sections">
                {/* Today's Menu Section */}
                <div className="section-card">
                    <h2>{selectedMealType} Menu for {formatDate(selectedDate)}</h2>
                    {isLoading ? (
                        <div className="loading-state">
                            <div className="spinner-large"></div>
                            <p>Loading menu...</p>
                        </div>
                    ) : getMealsForType().length === 0 ? (
                        <div className="no-data">
                            <p>No meals added for {selectedMealType.toLowerCase()} on {formatDate(selectedDate)}</p>
                            <button className="btn-primary" onClick={handleAddToMenuModal} type="button">
                                <FiPlus /> Add Meals
                            </button>
                        </div>
                    ) : (
                        <div className="menu-list">
                            {getMealsForType().map((meal) => (
                                <div key={meal.id} className="menu-item">
                                    <div className="menu-item-info">
                                        <h3>{meal.name}</h3>
                                        <p>{meal.description}</p>
                                        <div className="menu-item-meta">
                      <span className={`meal-type-badge ${meal.mealType.toLowerCase()}`}>
                        {meal.mealType}
                      </span>
                                            {meal.compatibleDiets && meal.compatibleDiets.length > 0 && (
                                                <span className="diet-badges">
                          {meal.compatibleDiets.slice(0, 3).map(diet => (
                              <span key={diet} className="diet-badge">{diet.replace('_', ' ')}</span>
                          ))}
                                                    {meal.compatibleDiets.length > 3 && (
                                                        <span className="diet-badge more">+{meal.compatibleDiets.length - 3}</span>
                                                    )}
                        </span>
                                            )}
                                            {meal.orderDeadline && (
                                                <span className="deadline-badge">
                          <FiCalendar /> Closes: {formatTime(meal.orderDeadline)}
                        </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="menu-item-actions">
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={meal.isActive}
                                                onChange={() => handleToggleAvailability(meal.id, meal.isActive)}
                                            />
                                            <span className="toggle-slider"></span>
                                            <span className="toggle-label">{meal.isActive ? 'Available' : 'Unavailable'}</span>
                                        </label>
                                        <button
                                            className="btn-icon danger"
                                            onClick={() => handleRemoveFromMenu(meal.id)}
                                            title="Remove from menu"
                                            type="button"
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Meal Catalog Section */}
                <div className="section-card">
                    <h2>Meal Catalog</h2>
                    {isLoading ? (
                        <div className="loading-state">
                            <div className="spinner-large"></div>
                            <p>Loading meals...</p>
                        </div>
                    ) : meals.length === 0 ? (
                        <div className="no-data">
                            <p>No meals in catalog yet</p>
                            <button className="btn-primary" onClick={handleCreateMeal} type="button">
                                <FiPlus /> Create First Meal
                            </button>
                        </div>
                    ) : (
                        <div className="meals-grid">
                            {meals.map((meal) => (
                                <div key={meal.id} className={`meal-card ${!meal.isActive ? 'inactive' : ''}`}>
                                    <div className="meal-card-info">
                                        <h3>{meal.name}</h3>
                                        <p>{meal.description}</p>
                                        <div className="meal-card-meta">
                      <span className={`meal-type-badge ${meal.mealType.toLowerCase()}`}>
                        {meal.mealType}
                      </span>
                                            {meal.compatibleDiets && meal.compatibleDiets.length > 0 && (
                                                <span className="diet-badges">
                          {meal.compatibleDiets.slice(0, 2).map(diet => (
                              <span key={diet} className="diet-badge small">{diet.replace('_', ' ')}</span>
                          ))}
                        </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="meal-card-actions">
                                        <button
                                            className="btn-icon"
                                            title={meal.isActive ? "Edit" : "View"}
                                            onClick={() => meal.isActive && handleEditMeal(meal)}
                                            disabled={!meal.isActive}
                                            type="button"
                                        >
                                            <FiEdit />
                                        </button>
                                        {meal.isActive ? (
                                            <button
                                                className="btn-icon danger"
                                                title="Deactivate"
                                                onClick={() => handleDeactivateMeal(meal.id)}
                                                type="button"
                                            >
                                                <FiTrash2 />
                                            </button>
                                        ) : (
                                            <button
                                                className="btn-icon success"
                                                title="Reactivate"
                                                onClick={() => handleReactivateMeal(meal.id)}
                                                type="button"
                                            >
                                                <FiSave />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Meal Modal */}
            {showMealModal && (
                <div className="modal-overlay" onClick={handleCloseMealModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{modalMode === 'create' ? 'Add New Meal' : 'Edit Meal'}</h2>
                            <button className="modal-close" onClick={handleCloseMealModal} type="button">
                                <FiX />
                            </button>
                        </div>

                        <form className="meal-form" onSubmit={handleSubmitMeal}>
                            <div className="form-group">
                                <label>Meal Name <span className="required">*</span></label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    disabled={isSubmitting}
                                    placeholder="e.g., Grilled Chicken Salad"
                                />
                            </div>

                            <div className="form-group">
                                <label>Description <span className="required">*</span></label>
                                <textarea
                                    rows={3}
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    required
                                    disabled={isSubmitting}
                                    placeholder="Brief description of the meal..."
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Meal Type <span className="required">*</span></label>
                                    <select
                                        name="mealType"
                                        value={formData.mealType}
                                        onChange={handleInputChange}
                                        required
                                        disabled={isSubmitting}
                                    >
                                        <option value="CEREAL">Cereal</option>
                                        <option value="BREAKFAST">Breakfast</option>
                                        <option value="LUNCH">Lunch</option>
                                        <option value="LUNCH_DESSERT">Lunch Dessert</option>
                                        <option value="THREE_PM_TEAS">3PM Teas</option>
                                        <option value="DINNER">Dinner</option>
                                        <option value="DINNER_DESSERT">Dinner Dessert</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Order Deadline (optional)</label>
                                    <input
                                        type="time"
                                        name="orderDeadline"
                                        value={formData.orderDeadline}
                                        onChange={handleInputChange}
                                        disabled={isSubmitting}
                                    />
                                    <small className="form-hint">Last time patients can order this meal</small>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Compatible Diets</label>
                                <div className="checkbox-group">
                                    {['NORMAL', 'DIABETIC', 'VEGAN', 'VEGETARIAN', 'LOW_SODIUM', 'GLUTEN_FREE', 'NUT_ALLERGY'].map(diet => (
                                        <label key={diet} className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={formData.compatibleDiets.includes(diet)}
                                                onChange={() => handleDietaryChange(diet)}
                                                disabled={isSubmitting}
                                            />
                                            <span>{diet.replace('_', ' ')}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={handleCloseMealModal}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="spinner-small"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <FiSave />
                                            {modalMode === 'create' ? 'Add Meal' : 'Update Meal'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add to Daily Menu Modal */}
            {showMenuModal && (
                <div className="modal-overlay" onClick={handleCloseMenuModal}>
                    <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add Meal to {selectedMealType} Menu</h2>
                            <p className="modal-subtitle">Select meals to add for {formatDate(selectedDate)}</p>
                            <button className="modal-close" onClick={handleCloseMenuModal} type="button">
                                <FiX />
                            </button>
                        </div>

                        {/* Meal Type Selector */}
                        <div className="meal-type-selector">
                            <label>Meal Type:</label>
                            <select
                                value={selectedMealType}
                                onChange={(e) => setSelectedMealType(e.target.value as any)}
                                disabled={isSubmitting}
                            >
                                <option value="CEREAL">Cereal</option>
                                <option value="BREAKFAST">Breakfast</option>
                                <option value="LUNCH">Lunch</option>
                                <option value="LUNCH_DESSERT">Lunch Dessert</option>
                                <option value="THREE_PM_TEAS">3PM Teas</option>
                                <option value="DINNER">Dinner</option>
                                <option value="DINNER_DESSERT">Dinner Dessert</option>
                            </select>
                        </div>

                        {meals.filter(m => m.isActive).length === 0 ? (
                            <div className="no-data">
                                <p>No active meals available</p>
                                <button className="btn-secondary" onClick={() => {
                                    handleCloseMenuModal()
                                    handleCreateMeal()
                                }} type="button">
                                    Create a Meal First
                                </button>
                            </div>
                        ) : (
                            <div className="meal-selection-grid">
                                {meals.filter((m) => m.isActive).map((meal) => (
                                    <div
                                        key={meal.id}
                                        className="meal-selection-card"
                                        onClick={() => handleAddToDailyMenu(meal)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault()
                                                handleAddToDailyMenu(meal)
                                            }
                                        }}
                                    >
                                        <div className="selection-card-header">
                                            <h3>{meal.name}</h3>
                                            <span className={`meal-type-badge ${meal.mealType.toLowerCase()}`}>
                        {meal.mealType}
                      </span>
                                        </div>
                                        <p>{meal.description}</p>
                                        {meal.compatibleDiets && meal.compatibleDiets.length > 0 && (
                                            <div className="selection-diets">
                                                {meal.compatibleDiets.slice(0, 2).map(diet => (
                                                    <span key={diet} className="diet-badge small">{diet.replace('_', ' ')}</span>
                                                ))}
                                            </div>
                                        )}
                                        {meal.orderDeadline && (
                                            <span className="deadline-small">
                        Order by: {formatTime(meal.orderDeadline)}
                      </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="form-actions">
                            <button className="btn-secondary" onClick={handleCloseMenuModal} type="button">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}