/**
 * Transaction Categories
 * Predefined categories for organizing transactions
 */

export interface Category {
    id: string;
    label: string;
    icon: string;
    color: string;
}

export const CATEGORIES: Category[] = [
    { id: 'general', label: 'General', icon: '📝', color: '#6b7280' },
    { id: 'rent', label: 'Rent', icon: '🏠', color: '#8b5cf6' },
    { id: 'bills', label: 'Bills', icon: '📄', color: '#f59e0b' },
    { id: 'food', label: 'Food', icon: '🍽️', color: '#10b981' },
    { id: 'transport', label: 'Transport', icon: '🚗', color: '#3b82f6' },
    { id: 'salary', label: 'Salary', icon: '💰', color: '#22c55e' },
    { id: 'shopping', label: 'Shopping', icon: '🛍️', color: '#ec4899' },
    { id: 'health', label: 'Health', icon: '🏥', color: '#ef4444' },
    { id: 'education', label: 'Education', icon: '📚', color: '#6366f1' },
    { id: 'utilities', label: 'Utilities', icon: '💡', color: '#f97316' },
    { id: 'savings', label: 'Savings', icon: '🏦', color: '#14b8a6' },
    { id: 'other', label: 'Other', icon: '📦', color: '#9ca3af' },
];

export const getCategoryById = (id: string): Category | undefined => {
    return CATEGORIES.find(c => c.id === id);
};

export const getCategoryLabel = (id: string): string => {
    return getCategoryById(id)?.label || 'General';
};

export const getCategoryColor = (id: string): string => {
    return getCategoryById(id)?.color || '#6b7280';
};

export const getCategoryIcon = (id: string): string => {
    return getCategoryById(id)?.icon || '📝';
};
