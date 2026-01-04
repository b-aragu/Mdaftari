/**
 * Main App Component
 */

import React, { useState } from 'react';
import { Navigation } from '../components/Layout';
import { HomePage, RecordPaymentPage, ReportsPage, SettingsPage } from '../pages';
import { useOutdoorMode } from '../hooks';


type Tab = 'home' | 'reports' | 'settings';
type View = 'main' | 'record';

export function App() {
    const [activeTab, setActiveTab] = useState<Tab>('home');
    const [view, setView] = useState<View>('main');
    const { isOutdoorMode } = useOutdoorMode();

    // Apply outdoor mode to document
    React.useEffect(() => {
        document.documentElement.setAttribute('data-outdoor', String(isOutdoorMode));
    }, [isOutdoorMode]);

    const handleRecordPayment = () => {
        setView('record');
    };

    const handleBack = () => {
        setView('main');
    };

    const handleSuccess = () => {
        setView('main');
        setActiveTab('home');
    };

    if (view === 'record') {
        return <RecordPaymentPage onBack={handleBack} onSuccess={handleSuccess} />;
    }

    return (
        <div className="app">
            {activeTab === 'home' && <HomePage onRecordPayment={handleRecordPayment} />}
            {activeTab === 'reports' && <ReportsPage />}
            {activeTab === 'settings' && <SettingsPage />}

            <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
    );
}
