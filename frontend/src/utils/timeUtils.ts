/**
 * Format date to readable string
 */
export function formatDate(date: string | Date): string {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })
}

/**
 * Format time to readable string
 */
export function formatTime(date: string | Date): string {
    const d = new Date(date)
    return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    })
}

/**
 * Check if ordering is still open for a meal
 */
export function isOrderingOpen(mealType: string): boolean {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTime = currentHour * 60 + currentMinute

    const servingTimes: Record<string, number> = {
        BREAKFAST: 8 * 60,    // 08:00
        LUNCH: 13 * 60,       // 13:00
        SUPPER: 19 * 60,      // 19:00
    }

    const servingTime = servingTimes[mealType]
    const cutoffTime = servingTime - 60 // 1 hour before

    // Check if past serving time
    if (currentTime > servingTime) {
        return false
    }

    // Check if within cutoff period
    if (currentTime > cutoffTime) {
        return false
    }

    return true
}

/**
 * Get minutes until cutoff
 */
export function getMinutesUntilCutoff(mealType: string): number {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTime = currentHour * 60 + currentMinute

    const servingTimes: Record<string, number> = {
        BREAKFAST: 8 * 60,
        LUNCH: 13 * 60,
        SUPPER: 19 * 60,
    }

    const cutoffTime = servingTimes[mealType] - 60

    if (currentTime >= cutoffTime) {
        return 0
    }

    return cutoffTime - currentTime
}