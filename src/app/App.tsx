/**
 * Main App Component
 */

import { useState, useEffect } from 'react';
import { Navigation } from '../components/Layout';
import { HomePage, RecordPaymentPage, ReportsPage, SettingsPage } from '../pages';
import { Onboarding } from '../components/Onboarding';
import { ToastProvider, useToast } from '../context';

const ONBOARDING_KEY = 'mdaftari_onboarding_complete';

type Tab = 'home' | 'reports' | 'settings';
type View = 'main' | 'record';

function AppContent() {
    const [activeTab, setActiveTab] = useState<Tab>('home');
    const [view, setView] = useState<View>('main');
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [appMode, setAppMode] = useState<'collections' | 'payments' | 'overview'>(() => {
        const saved = localStorage.getItem('mdaftari_app_mode');
        if (saved === 'payments') return 'payments';
        if (saved === 'overview') return 'overview';
        return 'collections';
    });
    const { showToast } = useToast();

    // Check if user has completed onboarding
    useEffect(() => {
        const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_KEY);
        if (!hasCompletedOnboarding) {
            setShowOnboarding(true);
        }
    }, []);

    // Sync appMode from localStorage (in case it changes in Home/Reports)
    useEffect(() => {
        const handleStorageChange = () => {
            const saved = localStorage.getItem('mdaftari_app_mode');
            if (saved === 'payments') setAppMode('payments');
            else if (saved === 'overview') setAppMode('overview');
            else setAppMode('collections');
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const handleOnboardingComplete = () => {
        localStorage.setItem(ONBOARDING_KEY, 'true');
        setShowOnboarding(false);
    };

    const handleRecordPayment = () => {
        // Re-read mode from localStorage in case it changed
        const saved = localStorage.getItem('mdaftari_app_mode');
        if (saved === 'payments') setAppMode('payments');
        else if (saved === 'overview') setAppMode('overview');
        else setAppMode('collections');
        setView('record');
    };

    const handleBack = () => {
        setView('main');
    };

    const handleSuccess = () => {
        setView('main');
        setActiveTab('home');
        const msg = appMode === 'collections' ? 'Collection recorded!' :
            appMode === 'payments' ? 'Payment recorded!' : 'Transaction recorded!';
        showToast(msg, 'success');
    };

    if (view === 'record') {
        return <RecordPaymentPage onBack={handleBack} onSuccess={handleSuccess} mode={appMode} />;
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
