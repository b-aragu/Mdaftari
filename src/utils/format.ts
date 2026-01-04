/**
 * Utility Functions
 */

/**
 * Format currency in Kenyan Shillings
 */
export function formatKES(amount: number): string {
    return amount.toLocaleString('en-KE', {
        style: 'currency',
        currency: 'KES',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

/**
 * Format date in Kenyan locale
 */
export function formatDate(date: Date, style: 'short' | 'medium' | 'long' = 'medium'): string {
    return new Intl.DateTimeFormat('en-KE', {
        dateStyle: style,
    }).format(date);
}

/**
 * Format date with time
 */
export function formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('en-KE', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}

/**
 * Parse a number from string input, handling Kenyan number formats
 */
export function parseNumber(value: string): number {
    const cleaned = value.replace(/[,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

/**
 * Validate Kenyan phone number
 */
export function isValidKenyanPhone(phone: string): boolean {
    // Accept: 07xx, 01xx, +254, 254
    const cleaned = phone.replace(/[\s\-]/g, '');
    return /^(?:\+?254|0)[17]\d{8}$/.test(cleaned);
}

/**
 * Format phone number for display
 */
export function formatPhone(phone: string): string {
    const cleaned = phone.replace(/[\s\-]/g, '');

    // If starts with +254 or 254, convert to 0
    if (cleaned.startsWith('+254')) {
        return '0' + cleaned.slice(4);
    }
    if (cleaned.startsWith('254')) {
        return '0' + cleaned.slice(3);
    }

    return cleaned;
}
