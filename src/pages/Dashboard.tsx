/**
 * Dashboard Page - Premium Finance App
 * 
 * Main page showing balance overview, workers, and transactions
 */

import { useState, useCallback, useEffect } from 'react';
import { MessageInput } from '../components/MessageInput';
import { TransactionConfirm } from '../components/TransactionConfirm';
import { LedgerView } from '../components/LedgerView';
import {
    saveTransaction,
    createLedgerEntry,
    getTransactionsByUser,
    getLedgerEntriesByWorker,
} from '../storage';
import { detectPartialPayment } from '../ledger';
import type { ParseResult, ParsedTransaction } from '../parser/types';
import type { Transaction, LedgerEntry } from '../ledger/types';
import './Dashboard.css';

const TEMP_USER_ID = 'local-user';

export function Dashboard() {
    const [parseResult, setParseResult] = useState<ParseResult | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'record' | 'ledger'>('record');

    // Get app mode from localStorage
    const [appMode] = useState<'collections' | 'payments' | 'overview'>(() => {
        const saved = localStorage.getItem('mdaftari_app_mode');
        if (saved === 'payments') return 'payments';
        if (saved === 'overview') return 'overview';
        return 'collections';
    });

    // Calculate stats
    const stats = {
        totalReceived: ledgerEntries.reduce((sum, e) => sum + e.amountPaid, 0),
        totalOwed: ledgerEntries.reduce((sum, e) => sum + e.amountOwed, 0),
        transactionCount: transactions.length,
        workerCount: 0, // Will come from workers list
    };

    const percentPaid = stats.totalReceived + stats.totalOwed > 0
        ? Math.round((stats.totalReceived / (stats.totalReceived + stats.totalOwed)) * 100)
        : 0;

    // Calculate pending reminders (outstanding transactions older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const pendingReminders = transactions
        .filter(tx => {
            const entry = ledgerEntries.find(e => e.transactionId === tx.id);
            return entry && entry.amountOwed > 0 && tx.parsedData.dateTime < sevenDaysAgo;
        })
        .slice(0, 3);

    // Recent activity (last 5 transactions)
    const recentActivity = transactions
        .slice()
        .sort((a, b) => b.parsedData.dateTime.getTime() - a.parsedData.dateTime.getTime())
        .slice(0, 5);

    // Load existing data
    useEffect(() => {
        async function loadData() {
            try {
                const txs = await getTransactionsByUser(TEMP_USER_ID);
                setTransactions(txs);

                const allEntries: LedgerEntry[] = [];
                for (const tx of txs) {
                    const entries = await getLedgerEntriesByWorker(tx.userId);
                    allEntries.push(...entries);
                }
                setLedgerEntries(allEntries);
            } catch (err) {
                console.error('Failed to load data:', err);
            }
        }
        loadData();
    }, []);

    const handleParsed = useCallback((result: ParseResult) => {
        setParseResult(result);
        setIsConfirming(true);
        setError(null);
    }, []);

    const handleConfirm = useCallback(async (
        transaction: ParsedTransaction,
        expectedAmount: number,
        options?: { category?: string; isRecurring?: boolean }
    ) => {
        setIsSaving(true);
        setError(null);

        try {
            const savedTx = await saveTransaction(transaction, TEMP_USER_ID, expectedAmount, undefined, options);
            const partial = detectPartialPayment(transaction.amount, expectedAmount);

            const entry = await createLedgerEntry(
                savedTx.id,
                null,
                transaction.amount,
                partial.remainingDebt,
                transaction.amount,
                partial.remainingDebt
            );

            setTransactions(prev => [savedTx, ...prev]);
            setLedgerEntries(prev => [entry, ...prev]);
            setParseResult(null);
            setIsConfirming(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setIsSaving(false);
        }
    }, []);

    const handleCancel = useCallback(() => {
        setParseResult(null);
        setIsConfirming(false);
        setError(null);
    }, []);

    const formatMoney = (amount: number) => {
        return amount.toLocaleString('en-KE', { minimumFractionDigits: 0 });
    };

    return (
        <div className="dashboard">
            {/* Premium Header */}
            <header className="dashboard-header">
                <div className="dashboard-header__bg" />
                <div className="dashboard-header__content container">
                    <div className="dashboard-header__top">
                        <div className="dashboard-header__brand">
                            <span className="dashboard-header__logo">📘</span>
                            <span className="dashboard-header__name">Mdaftari</span>
                        </div>
                    </div>

                    {/* Balance Overview Card */}
                    <div className="balance-card animate-fadeIn">
                        <div className="balance-card__header">
                            <span className="balance-card__label">Total Balance</span>
                            <span className="balance-card__badge">
                                {transactions.length} {appMode === 'collections' ? 'collection' : 'transaction'}{transactions.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        <div className="balance-card__amounts">
                            <div className="balance-card__main">
                                <span className="balance-card__currency">KES</span>
                                <span className="balance-card__value">{formatMoney(stats.totalReceived)}</span>
                            </div>
                            <span className="balance-card__label-small">{appMode === 'collections' ? 'collected' : 'received'}</span>
                        </div>

                        {stats.totalOwed > 0 && (
                            <div className="balance-card__owed">
                                <span className="balance-card__owed-label">{appMode === 'payments' ? 'You still owe:' : 'Still owed:'}</span>
                                <span className="balance-card__owed-value">KES {formatMoney(stats.totalOwed)}</span>
                            </div>
                        )}

                        {(stats.totalReceived > 0 || stats.totalOwed > 0) && (
                            <div className="balance-card__progress">
                                <div className="balance-card__progress-bar">
                                    <div
                                        className="balance-card__progress-fill"
                                        style={{ width: `${percentPaid}%` }}
                                    />
                                </div>
                                <span className="balance-card__progress-label">{percentPaid}% {appMode === 'collections' ? 'collected' : 'paid'}</span>
                            </div>
                        )}
                    </div>

                    {/* Quick Stats */}
                    <div className="quick-stats">
                        <div className="quick-stat">
                            <span className="quick-stat__icon">💰</span>
                            <div className="quick-stat__content">
                                <span className="quick-stat__value money--received">+{formatMoney(stats.totalReceived)}</span>
                                <span className="quick-stat__label">{appMode === 'collections' ? 'Collected' : 'Received'}</span>
                            </div>
                        </div>
                        <div className="quick-stat">
                            <span className="quick-stat__icon">📊</span>
                            <div className="quick-stat__content">
                                <span className="quick-stat__value money--owed">-{formatMoney(stats.totalOwed)}</span>
                                <span className="quick-stat__label">{appMode === 'payments' ? 'You Owe' : 'Owed to You'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Pending Reminders */}
            {pendingReminders.length > 0 && (
                <div className="dashboard-section container">
                    <h3 className="dashboard-section__title">
                        ⏰ Pending ({pendingReminders.length})
                    </h3>
                    <div className="pending-list">
                        {pendingReminders.map(tx => {
                            const entry = ledgerEntries.find(e => e.transactionId === tx.id);
                            const daysSince = Math.floor((Date.now() - tx.parsedData.dateTime.getTime()) / (1000 * 60 * 60 * 24));
                            return (
                                <div key={tx.id} className="pending-item">
                                    <span className="pending-name">
                                        {tx.parsedData.counterparty.name || tx.parsedData.counterparty.phone}
                                    </span>
                                    <span className="pending-amount">
                                        {appMode === 'payments' ? 'You owe' : 'Owes'} KES {formatMoney(entry?.amountOwed || 0)}
                                    </span>
                                    <span className="pending-days">{daysSince} days</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
                <div className="dashboard-section container">
                    <h3 className="dashboard-section__title">📋 Recent Activity</h3>
                    <div className="recent-list">
                        {recentActivity.map(tx => {
                            const isIn = tx.parsedData.type === 'received';
                            return (
                                <div key={tx.id} className="recent-item">
                                    <span className={`recent-icon ${isIn ? 'recent-icon--in' : 'recent-icon--out'}`}>
                                        {isIn ? '↓' : '↑'}
                                    </span>
                                    <span className="recent-name">
                                        {tx.parsedData.counterparty.name || tx.parsedData.counterparty.phone || 'Payment'}
                                    </span>
                                    <span className={`recent-amount ${isIn ? 'money--received' : 'money--owed'}`}>
                                        {isIn ? '+' : '-'}KES {formatMoney(tx.parsedData.amount)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="dashboard-tabs container">
                <button
                    className={`dashboard-tab ${activeTab === 'record' ? 'dashboard-tab--active' : ''}`}
                    onClick={() => setActiveTab('record')}
                >
                    <span className="dashboard-tab__icon">➕</span>
                    Record Payment
                </button>
                <button
                    className={`dashboard-tab ${activeTab === 'ledger' ? 'dashboard-tab--active' : ''}`}
                    onClick={() => setActiveTab('ledger')}
                >
                    <span className="dashboard-tab__icon">📒</span>
                    Ledger
                </button>
            </div>

            {/* Main Content */}
            <main className="dashboard-main container">
                {error && (
                    <div className="dashboard-error animate-slideUp" role="alert">
                        <span className="dashboard-error__icon">⚠️</span>
                        <span>{error}</span>
                        <button onClick={() => setError(null)}>✕</button>
                    </div>
                )}

                {activeTab === 'record' && (
                    <div className="animate-fadeIn">
                        {!isConfirming ? (
                            <MessageInput onParsed={handleParsed} />
                        ) : (
                            parseResult && (
                                <TransactionConfirm
                                    parseResult={parseResult}
                                    onConfirm={handleConfirm}
                                    onCancel={handleCancel}
                                    isLoading={isSaving}
                                />
                            )
                        )}
                    </div>
                )}

                {activeTab === 'ledger' && (
                    <div className="animate-fadeIn">
                        <LedgerView
                            transactions={transactions}
                            entries={ledgerEntries}
                        />
                    </div>
                )}
            </main>

            {/* Bottom Navigation (mobile-first) */}
            <nav className="dashboard-nav">
                <a href="#" className="dashboard-nav__item dashboard-nav__item--active">
                    <span className="dashboard-nav__icon">🏠</span>
                    <span className="dashboard-nav__label">Home</span>
                </a>
                <a href="#" className="dashboard-nav__item">
                    <span className="dashboard-nav__icon">👥</span>
                    <span className="dashboard-nav__label">Workers</span>
                </a>
                <a href="#" className="dashboard-nav__item">
                    <span className="dashboard-nav__icon">📊</span>
                    <span className="dashboard-nav__label">Reports</span>
                </a>
                <a href="#" className="dashboard-nav__item">
                    <span className="dashboard-nav__icon">⚙️</span>
                    <span className="dashboard-nav__label">Settings</span>
                </a>
            </nav>
        </div>
    );
}
