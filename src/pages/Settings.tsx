/**
 * Settings Page
 */

import { useState, useEffect } from 'react';
import { Trash2, Download, Shield, ChevronRight, HelpCircle, Tags, Plus, X } from 'lucide-react';
import { clearAllData, clearDataByMode, exportAllData, bulkRecategorizeTransactions, getAllCategories, addCustomCategory, deleteCustomCategory } from '../storage';
import { suggestCategory } from '../constants/autoCategorize';
import type { Category } from '../constants/categories';
import './Settings.css';

export function SettingsPage() {
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [showConfirmCollections, setShowConfirmCollections] = useState(false);
    const [showConfirmPayments, setShowConfirmPayments] = useState(false);

    // Categories management
    const [categories, setCategories] = useState<Category[]>([]);
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryLabel, setNewCategoryLabel] = useState('');
    const [newCategoryEmoji, setNewCategoryEmoji] = useState('📁');

    // Load categories on mount
    useEffect(() => {
        setCategories(getAllCategories());
    }, []);

    const handleAddCategory = () => {
        if (newCategoryLabel.trim()) {
            addCustomCategory(newCategoryLabel.trim(), newCategoryEmoji, '#6366f1'); // Default indigo color
            setCategories(getAllCategories());
            setNewCategoryLabel('');
            setNewCategoryEmoji('📁');
            setShowAddCategory(false);
        }
    };

    const handleDeleteCategory = (id: string) => {
        if (confirm('Delete this category?')) {
            deleteCustomCategory(id);
            setCategories(getAllCategories());
        }
    };

    const handleExport = async () => {
        try {
            const data = await exportAllData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mdaftari-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to export data:', err);
        }
    };

    const handleClearCollections = async () => {
        try {
            const result = await clearDataByMode('collections');
            alert(`Cleared ${result.deletedCount} collection transactions`);
            window.location.reload();
        } catch (err) {
            console.error('Failed to clear collections:', err);
        }
    };

    const handleClearPayments = async () => {
        try {
            const result = await clearDataByMode('payments');
            alert(`Cleared ${result.deletedCount} payment transactions`);
            window.location.reload();
        } catch (err) {
            console.error('Failed to clear payments:', err);
        }
    };

    const handleClearData = async () => {
        try {
            await clearAllData();
            // Also clear onboarding flag so user sees tutorial again
            localStorage.removeItem('mdaftari_onboarding_complete');
            window.location.reload();
        } catch (err) {
            console.error('Failed to clear data:', err);
        }
    };

    const handleShowOnboarding = () => {
        localStorage.removeItem('mdaftari_onboarding_complete');
        window.location.reload();
    };

    const handleRecategorize = async () => {
        try {
            const result = await bulkRecategorizeTransactions(suggestCategory);
            alert(`Auto-categorized ${result.updated} of ${result.total} transactions`);
            window.location.reload();
        } catch (err) {
            console.error('Failed to re-categorize:', err);
            alert('Failed to re-categorize transactions');
        }
    };

    return (
        <div className="settings">
            <header className="settings-header">
                <h1 className="settings-title">Settings</h1>
            </header>

            <div className="settings-content">

                {/* Help Section */}
                <section className="settings-section">
                    <h2 className="settings-section-title">Help</h2>

                    <div className="settings-list">
                        <button className="settings-item" onClick={handleShowOnboarding}>
                            <div className="settings-item-icon">
                                <HelpCircle size={20} />
                            </div>
                            <div className="settings-item-content">
                                <span className="settings-item-label">Show Tutorial</span>
                                <span className="settings-item-desc">View the getting started guide</span>
                            </div>
                            <ChevronRight size={18} className="settings-item-arrow" />
                        </button>
                    </div>
                </section>

                {/* Categories Section */}
                <section className="settings-section">
                    <h2 className="settings-section-title">Categories</h2>

                    <div className="categories-grid">
                        {categories.map(cat => (
                            <div key={cat.id} className="category-chip">
                                <span className="category-chip__icon">{cat.icon}</span>
                                <span className="category-chip__label">{cat.label}</span>
                                {cat.id.startsWith('custom_') && (
                                    <button
                                        className="category-chip__delete"
                                        onClick={() => handleDeleteCategory(cat.id)}
                                        title="Delete category"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            className="category-chip category-chip--add"
                            onClick={() => setShowAddCategory(true)}
                        >
                            <Plus size={16} />
                            <span>Add</span>
                        </button>
                    </div>
                </section>

                {/* Data Section */}
                <section className="settings-section">
                    <h2 className="settings-section-title">Data</h2>

                    <div className="settings-list">
                        <button className="settings-item" onClick={handleExport}>
                            <div className="settings-item-icon">
                                <Download size={20} />
                            </div>
                            <div className="settings-item-content">
                                <span className="settings-item-label">Export Data</span>
                                <span className="settings-item-desc">Download all transactions as JSON</span>
                            </div>
                            <ChevronRight size={18} className="settings-item-arrow" />
                        </button>

                        <button className="settings-item" onClick={handleRecategorize}>
                            <div className="settings-item-icon settings-item-icon--info">
                                <Tags size={20} />
                            </div>
                            <div className="settings-item-content">
                                <span className="settings-item-label">Auto-Categorize</span>
                                <span className="settings-item-desc">Apply categories to existing transactions</span>
                            </div>
                            <ChevronRight size={18} className="settings-item-arrow" />
                        </button>

                        <button className="settings-item settings-item--warning" onClick={() => setShowConfirmCollections(true)}>
                            <div className="settings-item-icon">
                                <Trash2 size={20} />
                            </div>
                            <div className="settings-item-content">
                                <span className="settings-item-label">Clear Collections Data</span>
                                <span className="settings-item-desc">Delete only received transactions</span>
                            </div>
                            <ChevronRight size={18} className="settings-item-arrow" />
                        </button>

                        <button className="settings-item settings-item--warning" onClick={() => setShowConfirmPayments(true)}>
                            <div className="settings-item-icon">
                                <Trash2 size={20} />
                            </div>
                            <div className="settings-item-content">
                                <span className="settings-item-label">Clear Payments Data</span>
                                <span className="settings-item-desc">Delete only sent transactions</span>
                            </div>
                            <ChevronRight size={18} className="settings-item-arrow" />
                        </button>

                        <button className="settings-item settings-item--danger" onClick={() => setShowConfirmDelete(true)}>
                            <div className="settings-item-icon">
                                <Trash2 size={20} />
                            </div>
                            <div className="settings-item-content">
                                <span className="settings-item-label">Clear All Data</span>
                                <span className="settings-item-desc">Delete ALL transactions (both modes)</span>
                            </div>
                            <ChevronRight size={18} className="settings-item-arrow" />
                        </button>
                    </div>
                </section>

                {/* About Section */}
                <section className="settings-section">
                    <h2 className="settings-section-title">About</h2>

                    <div className="settings-list">
                        <div className="settings-item">
                            <div className="settings-item-icon">
                                <Shield size={20} />
                            </div>
                            <div className="settings-item-content">
                                <span className="settings-item-label">Privacy</span>
                                <span className="settings-item-desc">
                                    All data is stored locally on your device
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Version */}
                <div className="settings-footer">
                    <p className="settings-version">Mdaftari v0.1.0</p>
                    <p className="settings-tagline">Track Every Shilling</p>
                </div>
            </div>

            {/* Delete All Confirmation Modal */}
            {showConfirmDelete && (
                <div className="settings-modal-overlay" onClick={() => setShowConfirmDelete(false)}>
                    <div className="settings-modal" onClick={e => e.stopPropagation()}>
                        <h3>Delete All Data?</h3>
                        <p>This will permanently delete ALL your transactions and payment history (both Collections and Payments).</p>
                        <div className="settings-modal-actions">
                            <button className="settings-modal-btn settings-modal-btn--cancel" onClick={() => setShowConfirmDelete(false)}>
                                Cancel
                            </button>
                            <button className="settings-modal-btn settings-modal-btn--delete" onClick={handleClearData}>
                                Delete Everything
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear Collections Confirmation Modal */}
            {showConfirmCollections && (
                <div className="settings-modal-overlay" onClick={() => setShowConfirmCollections(false)}>
                    <div className="settings-modal" onClick={e => e.stopPropagation()}>
                        <h3>Clear Collections Data?</h3>
                        <p>This will delete only your <strong>received</strong> transactions. Your payment transactions will be kept.</p>
                        <div className="settings-modal-actions">
                            <button className="settings-modal-btn settings-modal-btn--cancel" onClick={() => setShowConfirmCollections(false)}>
                                Cancel
                            </button>
                            <button className="settings-modal-btn settings-modal-btn--warning" onClick={handleClearCollections}>
                                Clear Collections
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear Payments Confirmation Modal */}
            {showConfirmPayments && (
                <div className="settings-modal-overlay" onClick={() => setShowConfirmPayments(false)}>
                    <div className="settings-modal" onClick={e => e.stopPropagation()}>
                        <h3>Clear Payments Data?</h3>
                        <p>This will delete only your <strong>sent</strong> transactions. Your collection transactions will be kept.</p>
                        <div className="settings-modal-actions">
                            <button className="settings-modal-btn settings-modal-btn--cancel" onClick={() => setShowConfirmPayments(false)}>
                                Cancel
                            </button>
                            <button className="settings-modal-btn settings-modal-btn--warning" onClick={handleClearPayments}>
                                Clear Payments
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Category Modal */}
            {showAddCategory && (
                <div className="settings-modal-overlay" onClick={() => setShowAddCategory(false)}>
                    <div className="settings-modal" onClick={e => e.stopPropagation()}>
                        <h3>Add Category</h3>
                        <div className="add-category-form">
                            <div className="emoji-picker">
                                <label>Choose an emoji:</label>
                                <div className="emoji-options">
                                    {['📁', '🛒', '🍔', '🚗', '🏠', '💼', '🎉', '💰', '📱', '👕', '✈️', '🎓', '💊', '🎮', '🎁', '☕'].map(emoji => (
                                        <button
                                            key={emoji}
                                            type="button"
                                            className={`emoji-option ${newCategoryEmoji === emoji ? 'emoji-option--selected' : ''}`}
                                            onClick={() => setNewCategoryEmoji(emoji)}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="category-name-input">
                                <label>Category name:</label>
                                <input
                                    type="text"
                                    value={newCategoryLabel}
                                    onChange={e => setNewCategoryLabel(e.target.value)}
                                    placeholder="e.g. Groceries"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="settings-modal-actions">
                            <button className="settings-modal-btn settings-modal-btn--cancel" onClick={() => setShowAddCategory(false)}>
                                Cancel
                            </button>
                            <button
                                className="settings-modal-btn settings-modal-btn--confirm"
                                onClick={handleAddCategory}
                                disabled={!newCategoryLabel.trim()}
                            >
                                Add Category
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

