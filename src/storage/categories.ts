/**
 * Custom Categories Storage
 * CRUD operations for user-created categories stored in IndexedDB
 */

import { Category, CATEGORIES } from '../constants/categories';

const CUSTOM_CATEGORIES_KEY = 'mdaftari_custom_categories';

export interface CustomCategory extends Category {
    isDefault: false;
    createdAt: number;
}

/**
 * Get all categories (defaults + custom)
 */
export function getAllCategories(): (Category & { isDefault: boolean })[] {
    const defaults = CATEGORIES.map(c => ({ ...c, isDefault: true }));
    const custom = getCustomCategories().map(c => ({ ...c, isDefault: false }));
    return [...defaults, ...custom];
}

/**
 * Get custom categories from localStorage
 */
export function getCustomCategories(): CustomCategory[] {
    try {
        const stored = localStorage.getItem(CUSTOM_CATEGORIES_KEY);
        if (!stored) return [];
        return JSON.parse(stored);
    } catch {
        return [];
    }
}

/**
 * Add a new custom category
 */
export function addCustomCategory(label: string, icon: string, color: string): CustomCategory {
    const categories = getCustomCategories();

    // Generate unique ID
    const id = `custom_${label.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;

    const newCategory: CustomCategory = {
        id,
        label,
        icon,
        color,
        isDefault: false,
        createdAt: Date.now()
    };

    categories.push(newCategory);
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(categories));

    return newCategory;
}

/**
 * Update a custom category
 */
export function updateCustomCategory(id: string, updates: Partial<Pick<Category, 'label' | 'icon' | 'color'>>): boolean {
    const categories = getCustomCategories();
    const index = categories.findIndex(c => c.id === id);

    if (index === -1) return false;

    const existing = categories[index]!;
    categories[index] = {
        id: existing.id,
        label: updates.label ?? existing.label,
        icon: updates.icon ?? existing.icon,
        color: updates.color ?? existing.color,
        isDefault: false as const,
        createdAt: existing.createdAt
    };
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(categories));

    return true;
}

/**
 * Delete a custom category
 */
export function deleteCustomCategory(id: string): boolean {
    const categories = getCustomCategories();
    const filtered = categories.filter(c => c.id !== id);

    if (filtered.length === categories.length) return false;

    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(filtered));
    return true;
}
