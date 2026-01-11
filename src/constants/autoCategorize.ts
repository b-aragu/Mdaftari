/**
 * Auto-Categorization Utility
 * Analyzes transaction counterparty names and suggests categories
 * Based on common Kenyan business patterns
 */

import { getCategoryById, type Category } from './categories';

// Keyword patterns for each category (case-insensitive)
const CATEGORY_PATTERNS: Record<string, string[]> = {
    // Utilities - Power, Water, Internet, Phone
    utilities: [
        'KPLC', 'KENYA POWER', 'NAIROBI WATER', 'WATER COMPANY',
        'ZUKU', 'SAFARICOM', 'AIRTEL', 'TELKOM', 'FAIBA',
        'GOTV', 'DSTV', 'STARTIMES', 'NETFLIX', 'SHOWMAX',
    ],

    // Rent - Landlords, Property Management
    rent: [
        'RENT', 'LANDLORD', 'KAMULU', 'ESTATE', 'APARTMENT',
        'HOUSING', 'PROPERTY', 'CARETAKER',
    ],

    // Bills - General bills, Fees
    bills: [
        'INSURANCE', 'NHIF', 'KRA', 'SCHOOL FEE', 'SACCO',
        'LOAN', 'BANK', 'INTEREST', 'PREMIUM', 'SUBSCRIPTION',
    ],

    // Transport - Uber, Bolt, Fuel, Matatu
    transport: [
        'UBER', 'BOLT', 'LITTLE CAB', 'TOTAL', 'SHELL', 'RUBIS',
        'PETROL', 'FUEL', 'STAGE', 'BUS', 'SGR', 'AIRWAYS',
        'KENYA AIRWAYS', 'JAMBOJET', 'FLY540',
    ],

    // Food - Restaurants, Fast Food, Groceries for eating out
    food: [
        'JAVA', 'KFC', 'CHICKEN INN', 'PIZZA INN', 'DOMINOS',
        'SUBWAY', 'MCDONALDS', 'BURGER', 'RESTAURANT', 'CAFE',
        'HOTEL', 'FOOD', 'MEALS', 'LUNCH', 'DINNER', 'BREAKFAST',
        'ARTCAFFE', 'BIG SQUARE', 'SPUR',
    ],

    // Shopping - Supermarkets, Retail
    shopping: [
        'NAIVAS', 'CARREFOUR', 'QUICKMART', 'CHANDARANA',
        'CLEANSHELF', 'TUSKYS', 'UCHUMI', 'SHOPRITE',
        'GAME', 'JUMIA', 'KILIMALL', 'MASOKO',
        'MARKET', 'SHOP', 'STORE', 'RETAIL', 'MALL',
    ],

    // Health - Hospitals, Pharmacies, Clinics
    health: [
        'HOSPITAL', 'CLINIC', 'PHARMACY', 'CHEMIST', 'MEDICAL',
        'DOCTOR', 'NAIROBI HOSPITAL', 'KENYATTA', 'AGAI KHAN',
        'GERTRUDE', 'MATER', 'LANCET', 'HEALTHPLUS',
    ],

    // Education - Schools, Universities, Training
    education: [
        'SCHOOL', 'COLLEGE', 'UNIVERSITY', 'ACADEMY', 'INSTITUTE',
        'TRAINING', 'COURSE', 'TUITION', 'BOOKS', 'STATIONERY',
        'UON', 'KENYATTA UNIVERSITY', 'STRATHMORE',
    ],

    // Salary/Income - Wages, Salaries
    salary: [
        'SALARY', 'WAGE', 'PAYROLL', 'COMMISSION', 'BONUS',
        'ALLOWANCE', 'STIPEND', 'PAYMENT FROM EMPLOYER',
    ],

    // Savings - Banks, SACCOs for savings
    savings: [
        'SAVINGS', 'DEPOSIT', 'M-SHWARI', 'KCB M-PESA', 'FULIZA',
        'INVESTMENT', 'FIXED DEPOSIT',
    ],
};

/**
 * Suggests a category based on the counterparty name
 * @param counterpartyName - The name of the person/business
 * @returns The suggested category ID or 'general' if no match
 */
export function suggestCategory(counterpartyName: string | undefined): string {
    if (!counterpartyName) return 'general';

    const name = counterpartyName.toUpperCase();

    // Check each category's patterns
    for (const [categoryId, patterns] of Object.entries(CATEGORY_PATTERNS)) {
        for (const pattern of patterns) {
            if (name.includes(pattern.toUpperCase())) {
                return categoryId;
            }
        }
    }

    return 'general';
}

/**
 * Suggests a category with confidence level
 * @param counterpartyName - The name of the person/business
 * @returns Object with category ID and confidence (high, medium, low)
 */
export function suggestCategoryWithConfidence(counterpartyName: string | undefined): {
    categoryId: string;
    confidence: 'high' | 'medium' | 'low';
    category: Category | undefined;
} {
    if (!counterpartyName) {
        return { categoryId: 'general', confidence: 'low', category: getCategoryById('general') };
    }

    const name = counterpartyName.toUpperCase();

    // Exact business name matches get high confidence
    const highConfidenceMatches: Record<string, string[]> = {
        utilities: ['KPLC', 'KENYA POWER', 'SAFARICOM', 'AIRTEL', 'ZUKU', 'DSTV', 'GOTV'],
        transport: ['UBER', 'BOLT', 'LITTLE CAB', 'TOTAL', 'SHELL'],
        food: ['JAVA', 'KFC', 'CHICKEN INN', 'PIZZA INN', 'ARTCAFFE'],
        shopping: ['NAIVAS', 'CARREFOUR', 'QUICKMART', 'CHANDARANA'],
        health: ['NAIROBI HOSPITAL', 'AGAI KHAN', 'GERTRUDE'],
    };

    // Check high confidence matches first
    for (const [categoryId, patterns] of Object.entries(highConfidenceMatches)) {
        for (const pattern of patterns) {
            if (name.includes(pattern)) {
                return {
                    categoryId,
                    confidence: 'high',
                    category: getCategoryById(categoryId)
                };
            }
        }
    }

    // Check medium confidence (general patterns)
    for (const [categoryId, patterns] of Object.entries(CATEGORY_PATTERNS)) {
        for (const pattern of patterns) {
            if (name.includes(pattern.toUpperCase())) {
                return {
                    categoryId,
                    confidence: 'medium',
                    category: getCategoryById(categoryId)
                };
            }
        }
    }

    return { categoryId: 'general', confidence: 'low', category: getCategoryById('general') };
}

/**
 * Batch categorize multiple transactions
 * @param counterpartyNames - Array of counterparty names
 * @returns Array of suggested category IDs
 */
export function batchSuggestCategories(counterpartyNames: (string | undefined)[]): string[] {
    return counterpartyNames.map(name => suggestCategory(name));
}
