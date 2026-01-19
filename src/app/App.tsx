/**
 * Main App Component with React Router
 * Landing page at / and main app at /app
 */

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Navigation } from '../components/Layout';
import { LandingPage, HomePage, RecordPaymentPage, ReportsPage, SettingsPage, ShareHandler, ImportSMS } from '../pages';
import { Onboarding } from '../components/Onboarding';
import { ToastProvider, useToast } from '../context';

const ONBOARDING_KEY = 'mdaftari_onboarding_complete';

type Tab = 'home' | 'reports' | 'settings';
type View = 'main' | 'record' | 'sms-import';

function MainApp() {
    const location = useLocation();
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

    // Check if navigated from share handler - auto-open Record Payment
    useEffect(() => {
        const state = location.state as {
            openRecord?: boolean;
            fromShare?: boolean;
            shareMode?: 'collections' | 'payments'
        } | null;

        if (state?.openRecord && state?.fromShare) {
            // Switch to the correct mode based on transaction type
            if (state.shareMode) {
                setAppMode(state.shareMode);
                localStorage.setItem('mdaftari_app_mode', state.shareMode);
            }
            setView('record');
            // Clear the state so refreshing doesn't re-trigger
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // Listen for background SMS notifications
    useEffect(() => {
        const handleSmsReceived = () => {
            // New SMS detected, switch to import view
            // The view itself will scan inbox and find the latest message
            setView('sms-import');
        };

        window.addEventListener('smsReceived', handleSmsReceived);
        return () => window.removeEventListener('smsReceived', handleSmsReceived);
    }, []);

    // Also checking for Onboarding status
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

    if (view === 'sms-import') {
        return <ImportSMS onBack={handleBack} onSuccess={handleSuccess} />;
    }

    const handleImportSMS = () => {
        setView('sms-import');
    };

    return (
        <div className="app">
            {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}

            {activeTab === 'home' && <HomePage onRecordPayment={handleRecordPayment} />}
            {activeTab === 'reports' && <ReportsPage />}
            {activeTab === 'settings' && <SettingsPage onImportSMS={handleImportSMS} />}

            <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
    );
}

function AppContent() {
    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/app/share" element={<ShareHandler />} />
            <Route path="/app/*" element={<MainApp />} />
        </Routes>
    );
}

import { UpdatePrompt } from '../components/UpdatePrompt';

export function App() {
    return (
        <BrowserRouter>
            <ToastProvider>
                <AppContent />
                <UpdatePrompt />
            </ToastProvider>
        </BrowserRouter>
    );
}
