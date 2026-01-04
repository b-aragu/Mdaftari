/**
 * Navigation Component
 */

import React from 'react';
import { Home, FileText, Settings, Sun, Moon } from 'lucide-react';
import { useOutdoorMode } from '../../hooks';
import './Navigation.css';

type Tab = 'home' | 'reports' | 'settings';

interface NavigationProps {
    activeTab?: Tab;
    onTabChange?: (tab: Tab) => void;
}

export function Navigation({ activeTab = 'home', onTabChange }: NavigationProps) {
    const { isOutdoorMode, toggleOutdoorMode } = useOutdoorMode();

    const tabs = [
        { id: 'home' as Tab, label: 'Home', icon: Home },
        { id: 'reports' as Tab, label: 'Reports', icon: FileText },
        { id: 'settings' as Tab, label: 'Settings', icon: Settings },
    ];

    return (
        <>
            {/* Mobile: Bottom navigation */}
            <nav className="nav-mobile">
                {tabs.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        className={`nav-item ${activeTab === id ? 'nav-item--active' : ''}`}
                        onClick={() => onTabChange?.(id)}
                    >
                        <Icon size={20} strokeWidth={2} />
                        <span className="nav-label">{label}</span>
                    </button>
                ))}
                <button
                    className="nav-item"
                    onClick={toggleOutdoorMode}
                    aria-label={isOutdoorMode ? 'Switch to indoor mode' : 'Switch to outdoor mode'}
                >
                    {isOutdoorMode ? <Moon size={20} /> : <Sun size={20} />}
                    <span className="nav-label">Mode</span>
                </button>
            </nav>

            {/* Desktop: Sidebar */}
            <aside className="nav-sidebar">
                <div className="nav-sidebar-header">
                    <h1 className="nav-logo">Mdaftari</h1>
                    <span className="nav-tagline">Track Every Shilling</span>
                </div>

                <nav className="nav-sidebar-menu">
                    {tabs.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            className={`nav-sidebar-item ${activeTab === id ? 'nav-sidebar-item--active' : ''}`}
                            onClick={() => onTabChange?.(id)}
                        >
                            <Icon size={20} strokeWidth={2} />
                            <span>{label}</span>
                        </button>
                    ))}
                </nav>

                <div className="nav-sidebar-footer">
                    <button
                        className="nav-sidebar-mode"
                        onClick={toggleOutdoorMode}
                    >
                        {isOutdoorMode ? <Moon size={18} /> : <Sun size={18} />}
                        <span>{isOutdoorMode ? 'Indoor Mode' : 'Outdoor Mode'}</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
