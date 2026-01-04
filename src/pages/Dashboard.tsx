/**
 * Dashboard Page - Premium Finance App
 * 
 * Main page showing balance overview, workers, and transactions
 */

import React, { useState, useCallback, useEffect } from 'react';
import { MessageInput } from '../components/MessageInput';
import { TransactionConfirm } from '../components/TransactionConfirm';
import { LedgerView } from '../components/LedgerView';
import { Button } from '../components/ui';
import { Card, CardContent } from '../components/ui/Card';
import { useOutdoorMode } from '../hooks';
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

// Demo data for empty state
const DEMO_STATS = {
    totalReceived: 0,
    totalOwed: 0,
    transactionCount: 0,
    workerCount: 0,
};

export function Dashboard() {
    const { isOutdoorMode, toggleOutdoorMode } = useOutdoorMode();

    const [parseResult, setParseResult] = useState<ParseResult | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'record' | 'ledger'>('record');

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
        expectedAmount: number
    ) => {
        setIsSaving(true);
        setError(null);

        try {
            const savedTx = await saveTransaction(transaction, TEMP_USER_ID, expectedAmount);
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
                        <button
                            className={`outdoor-toggle ${isOutdoorMode ? 'outdoor-toggle--active' : ''}`}
                            onClick={toggleOutdoorMode}
                            aria-pressed={isOutdoorMode}
                            title={isOutdoorMode ? 'Switch to Indoor Mode' : 'Switch to Outdoor Mode'}
                        >
                            {isOutdoorMode ? '☀️' : '🌙'}
                        </button>
                    </div>

                    {/* Balance Overview Card */}
                    <div className="balance-card animate-fadeIn">
                        <div className="balance-card__header">
                            <span className="balance-card__label">Total Balance</span>
                            <span className="balance-card__badge">
                                {transactions.length} transactions
                            </span>
                        </div>

                        <div className="balance-card__amounts">
                            <div className="balance-card__main">
                                <span className="balance-card__currency">KES</span>
                                <span className="balance-card__value">{formatMoney(stats.totalReceived)}</span>
                            </div>
                            <span className="balance-card__label-small">received</span>
                        </div>

                        {stats.totalOwed > 0 && (
                            <div className="balance-card__owed">
                                <span className="balance-card__owed-label">Still owed:</span>
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
                                <span className="balance-card__progress-label">{percentPaid}% collected</span>
                            </div>
                        )}
                    </div>

                    {/* Quick Stats */}
                    <div className="quick-stats">
                        <div className="quick-stat">
                            <span className="quick-stat__icon">💰</span>
                            <div className="quick-stat__content">
                                <span className="quick-stat__value money--received">+{formatMoney(stats.totalReceived)}</span>
                                <span className="quick-stat__label">Received</span>
                            </div>
                        </div>
                        <div className="quick-stat">
                            <span className="quick-stat__icon">📊</span>
                            <div className="quick-stat__content">
                                <span className="quick-stat__value money--owed">-{formatMoney(stats.totalOwed)}</span>
                                <span className="quick-stat__label">Owed</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

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
                            showWorkerColumn={false}
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
