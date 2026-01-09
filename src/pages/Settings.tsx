/**
 * Settings Page
 */

import { useState } from 'react';
import { Sun, Moon, Trash2, Download, Shield, ChevronRight, HelpCircle } from 'lucide-react';
import { useOutdoorMode } from '../hooks';
import { clearAllData, clearDataByMode, exportAllData } from '../storage';
import './Settings.css';

export function SettingsPage() {
    const { isOutdoorMode, toggleOutdoorMode } = useOutdoorMode();
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [showConfirmCollections, setShowConfirmCollections] = useState(false);
    const [showConfirmPayments, setShowConfirmPayments] = useState(false);

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

    return (
        <div className="settings">
            <header className="settings-header">
                <h1 className="settings-title">Settings</h1>
            </header>

            <div className="settings-content">
                {/* Display Section */}
                <section className="settings-section">
                    <h2 className="settings-section-title">Display</h2>

                    <div className="settings-list">
                        <button className="settings-item" onClick={toggleOutdoorMode}>
                            <div className="settings-item-icon">
                                {isOutdoorMode ? <Sun size={20} /> : <Moon size={20} />}
                            </div>
                            <div className="settings-item-content">
                                <span className="settings-item-label">Outdoor Mode</span>
                                <span className="settings-item-desc">
                                    High contrast for bright environments
                                </span>
                            </div>
                            <div className={`settings-toggle ${isOutdoorMode ? 'settings-toggle--on' : ''}`}>
                                <div className="settings-toggle-knob" />
                            </div>
                        </button>
                    </div>
                </section>

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
        </div>
    );
}

