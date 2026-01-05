/**
 * Home Page - CountPesa Inspired
 */

import { useState, useEffect } from 'react';
import { Plus, ArrowDownLeft, ArrowUpRight, Calendar, ChevronRight, TrendingUp, TrendingDown, Users, X, ArrowLeft } from 'lucide-react';
import { getTransactionsByUser, getLedgerEntriesByTransaction } from '../storage';
import type { Transaction, LedgerEntry } from '../ledger/types';
import './Home.css';

const TEMP_USER_ID = 'local-user';

interface HomePageProps {
    onRecordPayment: () => void;
}

interface DayGroup {
    date: Date;
    dateLabel: string;
    transactions: Array<{ tx: Transaction; entry?: LedgerEntry }>;
    totalIn: number;
    totalOut: number;
}

interface PersonGroup {
    name: string;
    phone?: string;
    transactions: Array<{ tx: Transaction; entry?: LedgerEntry }>;
    totalReceived: number;
    totalOwed: number;
}

export function HomePage({ onRecordPayment }: HomePageProps) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activePeriod, setActivePeriod] = useState<'week' | 'month' | 'all'>('week');
    const [viewMode, setViewMode] = useState<'date' | 'person'>('person');
    const [selectedPerson, setSelectedPerson] = useState<PersonGroup | null>(null);

    useEffect(() => {
        async function loadData() {
            try {
                const txs = await getTransactionsByUser(TEMP_USER_ID);
                setTransactions(txs);

                // Get ledger entries for each transaction
                const allEntries: LedgerEntry[] = [];
                for (const tx of txs) {
                    const entries = await getLedgerEntriesByTransaction(tx.id);
                    allEntries.push(...entries);
                }
                setLedgerEntries(allEntries);
            } catch (err) {
                console.error('Failed to load data:', err);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, []);

    // Calculate totals
    const totalIn = ledgerEntries.reduce((sum, e) => sum + e.amountPaid, 0);
    const totalOut = ledgerEntries.reduce((sum, e) => sum + e.amountOwed, 0);

    // Group transactions by day (using actual transaction date, not import time)
    const dayGroups: DayGroup[] = [];
    const sortedTxs = [...transactions].sort((a, b) =>
        b.parsedData.dateTime.getTime() - a.parsedData.dateTime.getTime()
    );

    sortedTxs.forEach(tx => {
        const txDate = tx.parsedData.dateTime;
        const dateKey = txDate.toDateString();
        let group = dayGroups.find(g => g.date.toDateString() === dateKey);

        if (!group) {
            group = {
                date: txDate,
                dateLabel: formatDateLabel(txDate),
                transactions: [],
                totalIn: 0,
                totalOut: 0,
            };
            dayGroups.push(group);
        }

        const entry = ledgerEntries.find(e => e.transactionId === tx.id);
        group.transactions.push({ tx, entry });

        if (tx.parsedData.type === 'received') {
            group.totalIn += entry?.amountPaid || tx.parsedData.amount;
        } else {
            group.totalOut += entry?.amountPaid || tx.parsedData.amount;
        }
    });

    // Group transactions by person
    const personGroups: PersonGroup[] = [];
    transactions.forEach(tx => {
        const name = tx.parsedData.counterparty.name || 'Unknown';
        const phone = tx.parsedData.counterparty.phone;
        let group = personGroups.find(g => g.name === name);

        if (!group) {
            group = {
                name,
                phone,
                transactions: [],
                totalReceived: 0,
                totalOwed: 0,
            };
            personGroups.push(group);
        }

        const entry = ledgerEntries.find(e => e.transactionId === tx.id);
        group.transactions.push({ tx, entry });
        group.totalReceived += entry?.amountPaid || tx.parsedData.amount;
        group.totalOwed += entry?.amountOwed || 0;
    });

    // Sort by total owed (highest first)
    personGroups.sort((a, b) => b.totalOwed - a.totalOwed);

    function formatDateLabel(date: Date): string {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

        return new Intl.DateTimeFormat('en-KE', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        }).format(date);
    }

    const formatMoney = (amount: number) => amount.toLocaleString('en-KE');

    const formatTime = (date: Date) => {
        return new Intl.DateTimeFormat('en-KE', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }).format(date);
    };
    // Compute monthly breakdown for selected person
    const monthlyBreakdown = selectedPerson ? (() => {
        const months: { [key: string]: { month: string; received: number; owed: number; balance: number } } = {};
        let runningBalance = 0;

        // Sort transactions oldest first for cumulative calculation
        const sortedTxs = [...selectedPerson.transactions].sort(
            (a, b) => a.tx.parsedData.dateTime.getTime() - b.tx.parsedData.dateTime.getTime()
        );

        sortedTxs.forEach(({ tx, entry }) => {
            const date = tx.parsedData.dateTime;
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = new Intl.DateTimeFormat('en-KE', { month: 'short', year: 'numeric' }).format(date);

            if (!months[monthKey]) {
                months[monthKey] = { month: monthLabel, received: 0, owed: 0, balance: 0 };
            }

            const amount = entry?.amountPaid || tx.parsedData.amount;
            months[monthKey].received += amount;
            months[monthKey].owed += entry?.amountOwed || 0;
            runningBalance += amount;
            months[monthKey].balance = runningBalance;
        });

        return Object.values(months);
    })() : [];

    // If person is selected, show full-page detail view
    if (selectedPerson) {
        return (
            <div className="person-page">
                <header className="person-page-header">
                    <button className="back-btn" onClick={() => setSelectedPerson(null)}>
                        <ArrowLeft size={20} />
                        <span>Back</span>
                    </button>
                </header>

                <div className="person-page-content">
                    {/* Hero */}
                    <div className="person-hero">
                        <h1 className="person-hero-name">{selectedPerson.name}</h1>
                        {selectedPerson.phone && (
                            <p className="person-hero-phone">{selectedPerson.phone}</p>
                        )}
                    </div>

                    {/* Summary Cards */}
                    <div className="person-summary-cards">
                        <div className="person-stat-card person-stat-card--received">
                            <span className="stat-label">Total Received</span>
                            <span className="stat-value">Ksh {formatMoney(selectedPerson.totalReceived)}</span>
                        </div>
                        <div className="person-stat-card person-stat-card--owed">
                            <span className="stat-label">Still Owed</span>
                            <span className="stat-value">Ksh {formatMoney(selectedPerson.totalOwed)}</span>
                        </div>
                    </div>

                    {/* Monthly Breakdown Timeline */}
                    {monthlyBreakdown.length > 0 && (
                        <section className="monthly-breakdown">
                            <h3 className="section-label">Payment Timeline</h3>
                            <div className="timeline-chart">
                                {monthlyBreakdown.map((m, idx) => {
                                    const maxBalance = Math.max(...monthlyBreakdown.map(x => x.balance));
                                    const heightPercent = maxBalance > 0 ? (m.balance / maxBalance) * 100 : 0;
                                    return (
                                        <div key={idx} className="timeline-bar-container">
                                            <div
                                                className="timeline-bar"
                                                style={{ height: `${Math.max(heightPercent, 5)}%` }}
                                            >
                                                <span className="timeline-amount">
                                                    {formatMoney(m.received)}
                                                </span>
                                            </div>
                                            <span className="timeline-month">{m.month}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Transaction History */}
                    <section className="person-transactions">
                        <h3 className="section-label">
                            {selectedPerson.transactions.length} Transaction{selectedPerson.transactions.length !== 1 ? 's' : ''}
                        </h3>
                        <ul className="transaction-list">
                            {selectedPerson.transactions
                                .sort((a, b) => b.tx.parsedData.dateTime.getTime() - a.tx.parsedData.dateTime.getTime())
                                .map(({ tx, entry }) => {
                                    const isIn = tx.parsedData.type === 'received';
                                    const amount = entry?.amountPaid || tx.parsedData.amount;
                                    return (
                                        <li key={tx.id} className="transaction-item">
                                            <div className={`tx-icon ${isIn ? 'tx-icon--in' : 'tx-icon--out'}`}>
                                                {isIn ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                                            </div>
                                            <div className="tx-details">
                                                <span className="tx-date-full">
                                                    {new Intl.DateTimeFormat('en-KE', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    }).format(tx.parsedData.dateTime)}
                                                </span>
                                                <code className="tx-code">{tx.parsedData.transactionCode}</code>
                                            </div>
                                            <div className="tx-amount-wrapper">
                                                <span className={`tx-amount ${isIn ? 'money-in' : 'money-out'}`}>
                                                    {isIn ? '+' : '-'}Ksh {formatMoney(amount)}
                                                </span>
                                                {entry && entry.amountOwed > 0 && (
                                                    <span className="tx-owed">Owes: {formatMoney(entry.amountOwed)}</span>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                        </ul>
                    </section>
                </div>
            </div>
        );
    }

    return (
        <div className="home">
            {/* Header */}
            <header className="home-header">
                <div className="home-header-content">
                    <h1 className="home-logo">Mdaftari</h1>
                    <p className="home-tagline">Track <span className="highlight">Every Shilling</span></p>
                </div>
            </header>

            {/* Summary Cards - CountPesa Style */}
            <section className="summary-section">
                <div className="summary-cards">
                    <div className="summary-card summary-card--in">
                        <div className="summary-card-header">
                            <TrendingUp size={20} />
                            <span>Received</span>
                        </div>
                        <div className="summary-card-amount">
                            <span className="currency">Ksh</span>
                            <span className="money money-lg money-in">{formatMoney(totalIn)}</span>
                        </div>
                    </div>

                    <div className="summary-card summary-card--out">
                        <div className="summary-card-header">
                            <TrendingDown size={20} />
                            <span>Still Owed</span>
                        </div>
                        <div className="summary-card-amount">
                            <span className="currency">Ksh</span>
                            <span className="money money-lg money-out">{formatMoney(totalOut)}</span>
                        </div>
                    </div>
                </div>

                {/* Period Selector */}
                <div className="period-selector">
                    {['week', 'month', 'all'].map((period) => (
                        <button
                            key={period}
                            className={`period-btn ${activePeriod === period ? 'period-btn--active' : ''}`}
                            onClick={() => setActivePeriod(period as typeof activePeriod)}
                        >
                            {period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'All Time'}
                        </button>
                    ))}
                </div>

                {/* Quick Action */}
                <button className="record-btn" onClick={onRecordPayment}>
                    <Plus size={20} strokeWidth={2.5} />
                    <span>Record Payment</span>
                </button>
            </section>

            {/* Transactions List */}
            <section className="transactions-section">
                <div className="section-header">
                    <h2 className="section-title">
                        {viewMode === 'person' ? 'People' : 'Transactions'}
                    </h2>
                    <div className="view-toggle">
                        <button
                            className={`view-toggle-btn ${viewMode === 'person' ? 'view-toggle-btn--active' : ''}`}
                            onClick={() => setViewMode('person')}
                        >
                            <Users size={14} />
                            <span>People</span>
                        </button>
                        <button
                            className={`view-toggle-btn ${viewMode === 'date' ? 'view-toggle-btn--active' : ''}`}
                            onClick={() => setViewMode('date')}
                        >
                            <Calendar size={14} />
                            <span>By Date</span>
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="loading-state">Loading...</div>
                ) : transactions.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📊</div>
                        <h3>No transactions yet</h3>
                        <p>Record your first M-Pesa transaction to get started</p>
                    </div>
                ) : viewMode === 'person' ? (
                    /* Person View */
                    <div className="person-groups">
                        {personGroups.map((person, idx) => (
                            <div
                                key={idx}
                                className="person-card"
                                onClick={() => setSelectedPerson(person)}
                            >
                                <div className="person-info">
                                    <span className="person-name">{person.name}</span>
                                    <span className="person-count">
                                        {person.transactions.length} payment{person.transactions.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="person-totals">
                                    <span className="person-received">
                                        Ksh {formatMoney(person.totalReceived)}
                                    </span>
                                    {person.totalOwed > 0 && (
                                        <span className="person-owed">
                                            Owes: Ksh {formatMoney(person.totalOwed)}
                                        </span>
                                    )}
                                </div>
                                <ChevronRight size={18} className="person-chevron" />
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Date View */
                    <div className="day-groups">
                        {dayGroups.map((group, idx) => (
                            <div key={idx} className="day-group">
                                <div className="day-header">
                                    <span className="day-label">{group.dateLabel}</span>
                                    <div className="day-totals">
                                        {group.totalIn > 0 && (
                                            <span className="day-total day-total--in">+{formatMoney(group.totalIn)}</span>
                                        )}
                                        {group.totalOut > 0 && (
                                            <span className="day-total day-total--out">-{formatMoney(group.totalOut)}</span>
                                        )}
                                    </div>
                                </div>

                                <ul className="transaction-list">
                                    {group.transactions.map(({ tx, entry }) => {
                                        const isIn = tx.parsedData.type === 'received';
                                        const amount = entry?.amountPaid || tx.parsedData.amount;

                                        return (
                                            <li key={tx.id} className="transaction-item">
                                                <div className={`tx-icon ${isIn ? 'tx-icon--in' : 'tx-icon--out'}`}>
                                                    {isIn ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                                                </div>

                                                <div className="tx-details">
                                                    <span className="tx-name">
                                                        {tx.parsedData.counterparty.name || tx.parsedData.counterparty.phone || 'Payment'}
                                                    </span>
                                                    <div className="tx-meta">
                                                        <code className="tx-code">{tx.parsedData.transactionCode}</code>
                                                        <span className="tx-time">{formatTime(tx.parsedData.dateTime)}</span>
                                                    </div>
                                                </div>

                                                <div className="tx-amount-wrapper">
                                                    <span className={`tx-amount ${isIn ? 'money-in' : 'money-out'}`}>
                                                        {isIn ? '+' : '-'}Ksh {formatMoney(amount)}
                                                    </span>
                                                    {entry && entry.amountOwed > 0 && (
                                                        <span className="tx-owed">Owed: {formatMoney(entry.amountOwed)}</span>
                                                    )}
                                                </div>

                                                <ChevronRight size={16} className="tx-chevron" />
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
