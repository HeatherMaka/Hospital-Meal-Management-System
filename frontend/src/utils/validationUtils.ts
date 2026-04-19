/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/
    return phoneRegex.test(phone)
}

/**
 * Validate NIN format (adjust based on your country's format)
 */
export function isValidNIN(nin: string): boolean {
    return nin.length >= 8 && nin.length <= 20
}

/**
 * Validate password strength
 */
export function isPasswordStrong(password: string): boolean {
    return password.length >= 8
}

/**
 * Validate required field
 */
export function isRequired(value: string | number | undefined): boolean {
    if (typeof value === 'string') {
        return value.trim().length > 0
    }
    return value !== undefined && value !== null
}