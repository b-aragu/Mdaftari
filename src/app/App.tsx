/**
 * Main App Component with React Router
 * Landing page at / and main app at /app
 */

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Navigation } from '../components/Layout';
import { HomePage, RecordPaymentPage, ReportsPage, SettingsPage, ShareHandler, ImportSMS } from '../pages';
import { Onboarding } from '../components/Onboarding';
import { ToastProvider, useToast } from '../context';
import { useSMSListener } from '../hooks/useSMSListener';
import { MessageSquare } from 'lucide-react';

const ONBOARDING_KEY = 'mdaftari_onboarding_complete';

import { StatementImport } from '../components/StatementImport/StatementImport';

type Tab = 'home' | 'reports' | 'settings';
type View = 'main' | 'record' | 'sms-import' | 'statement-import';

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
    const { latestTransaction, latestRawMessage, clearTransaction } = useSMSListener();

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



    // Check for Onboarding status
    useEffect(() => {
        const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_KEY);
        if (!hasCompletedOnboarding) {
            setShowOnboarding(true);
        }
    }, []);

    // Auto-navigate to record page when SMS/Transaction arrives
    useEffect(() => {
        if (latestTransaction || latestRawMessage) {
            setView('record');
        }
    }, [latestTransaction, latestRawMessage]);

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
        clearTransaction();
        setView('main');
    };

    const handleSuccess = () => {
        setView('main');
        setActiveTab('home');
        const msg = appMode === 'collections' ? 'Collection recorded!' :
            appMode === 'payments' ? 'Payment recorded!' : 'Transaction recorded!';
        showToast(msg, 'success');
    };

    const handleImportSMS = () => {
        setView('sms-import');
    };

    const handleImportStatement = () => {
        setView('statement-import');
    }

    if (view === 'record') {
        return (
            <RecordPaymentPage
                onBack={handleBack}
                onSuccess={() => {
                    handleSuccess();
                    clearTransaction(); // Clear the banner transaction if it was used
                }}
                mode={appMode}
                initialTransaction={latestTransaction}
                initialRawMessage={latestRawMessage ?? undefined}
            />
        );
    }

    if (view === 'sms-import') {
        return <ImportSMS onBack={handleBack} onSuccess={handleSuccess} />;
    }

    if (view === 'statement-import') {
        return (
            <StatementImport
                onBack={handleBack}
                onComplete={handleSuccess}
                mode={appMode}
            />
        );
    }


    return (
        <div className="app">
            {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}

            {activeTab === 'home' && (
                <HomePage
                    onRecordPayment={handleRecordPayment}
                    onImportSMS={handleImportSMS}
                    onImportStatement={handleImportStatement}
                />
            )}
            {activeTab === 'reports' && <ReportsPage />}
            {activeTab === 'settings' && <SettingsPage onImportSMS={handleImportSMS} />}

            <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
            {/* SMS Notification Banner */}
            {latestTransaction && (
                <div className="sms-notification-banner">
                    <div className="sms-banner__content">
                        <div className="sms-banner__icon">
                            <MessageSquare size={20} />
                        </div>
                        <div className="sms-banner__text">
                            <h3>New M-Pesa Transaction</h3>
                            <p>
                                {latestTransaction.type === 'received' ? 'Received' : 'Sent'} KES {latestTransaction.amount.toLocaleString()}
                                {latestTransaction.type === 'received' ? ' from ' : ' to '}
                                {latestTransaction.counterparty.name || latestTransaction.counterparty.phone}
                            </p>
                        </div>
                    </div>
                    <div className="sms-banner__actions">
                        <button
                            className="sms-banner__btn sms-banner__btn--dismiss"
                            onClick={clearTransaction}
                        >
                            Dismiss
                        </button>
                        <button
                            className="sms-banner__btn sms-banner__btn--record"
                            onClick={handleRecordPayment}
                        >
                            Record Now
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

import { Navigate } from 'react-router-dom';

function AppContent() {
    return (
        <Routes>
            {/* Redirect landing page to app - skip marketing page for both PWA and Android */}
            <Route path="/" element={<Navigate to="/app" replace />} />
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
