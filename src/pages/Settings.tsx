/**
 * Settings Page
 */

import { Sun, Moon, Trash2, Download, Shield, ChevronRight } from 'lucide-react';
import { useOutdoorMode } from '../hooks';
import { clearAllData, exportAllData } from '../storage';
import './Settings.css';

export function SettingsPage() {
    const { isOutdoorMode, toggleOutdoorMode } = useOutdoorMode();

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
            alert('Failed to export data');
        }
    };

    const handleClearData = async () => {
        if (confirm('This will delete all your data. Are you sure?')) {
            try {
                await clearAllData();
                window.location.reload();
            } catch (err) {
                alert('Failed to clear data');
            }
        }
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

                        <button className="settings-item settings-item--danger" onClick={handleClearData}>
                            <div className="settings-item-icon">
                                <Trash2 size={20} />
                            </div>
                            <div className="settings-item-content">
                                <span className="settings-item-label">Clear All Data</span>
                                <span className="settings-item-desc">Delete all transactions</span>
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
        </div>
    );
}
