/**
 * Main App Component
 */

import { useState, useEffect } from 'react';
import { Navigation } from '../components/Layout';
import { HomePage, RecordPaymentPage, ReportsPage, SettingsPage } from '../pages';
import { Onboarding } from '../components/Onboarding';
import { useOutdoorMode } from '../hooks';
import { ToastProvider, useToast } from '../context';

const ONBOARDING_KEY = 'mdaftari_onboarding_complete';

type Tab = 'home' | 'reports' | 'settings';
type View = 'main' | 'record';

function AppContent() {
    const [activeTab, setActiveTab] = useState<Tab>('home');
    const [view, setView] = useState<View>('main');
    const [showOnboarding, setShowOnboarding] = useState(false);
    const { isOutdoorMode } = useOutdoorMode();
    const { showToast } = useToast();

    // Check if user has completed onboarding
    useEffect(() => {
        const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_KEY);
        if (!hasCompletedOnboarding) {
            setShowOnboarding(true);
        }
    }, []);

    // Apply outdoor mode to document
    useEffect(() => {
        document.documentElement.setAttribute('data-outdoor', String(isOutdoorMode));
    }, [isOutdoorMode]);

    const handleOnboardingComplete = () => {
        localStorage.setItem(ONBOARDING_KEY, 'true');
        setShowOnboarding(false);
    };

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
            {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}

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
