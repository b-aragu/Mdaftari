/**
 * Main App Component
 */

import React, { useState } from 'react';
import { Navigation } from '../components/Layout';
import { HomePage, RecordPaymentPage, ReportsPage, SettingsPage } from '../pages';
import { useOutdoorMode } from '../hooks';
import { ToastProvider, useToast } from '../context';


type Tab = 'home' | 'reports' | 'settings';
type View = 'main' | 'record';

function AppContent() {
    const [activeTab, setActiveTab] = useState<Tab>('home');
    const [view, setView] = useState<View>('main');
    const { isOutdoorMode } = useOutdoorMode();
    const { showToast } = useToast();

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
        showToast('Payment recorded successfully!', 'success');
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

export function App() {
    return (
        <ToastProvider>
            <AppContent />
        </ToastProvider>
    );
}
