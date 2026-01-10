/**
 * Home Page - CountPesa Inspired
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, ArrowDownLeft, ArrowUpRight, Calendar, ChevronRight, Users, ArrowLeft, FileText, Trash2, Edit3, Search, X, Wallet, CreditCard } from 'lucide-react';
import { getTransactionsByUser, getLedgerEntriesByTransaction, updateTransaction, deleteTransaction } from '../storage';
import { useCountUp } from '../hooks';
import { SkeletonPersonCard } from '../components/ui';
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
    const [appMode, setAppMode] = useState<'collections' | 'payments'>(() => {
        const saved = localStorage.getItem('mdaftari_app_mode');
        return (saved === 'payments') ? 'payments' : 'collections';
    });
    const [activePeriod, setActivePeriod] = useState<'week' | 'month' | 'all'>('week');
    const [viewMode, setViewMode] = useState<'date' | 'person'>('person');
    const [selectedPerson, setSelectedPerson] = useState<PersonGroup | null>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<{
        tx: Transaction;
        entry?: LedgerEntry;
    } | null>(null);
    const [selectedDay, setSelectedDay] = useState<DayGroup | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editExpectedAmount, setEditExpectedAmount] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
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
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Handle mode change with localStorage persistence
    const handleModeChange = (mode: 'collections' | 'payments') => {
        setAppMode(mode);
        localStorage.setItem('mdaftari_app_mode', mode);
        // Reset selection when changing modes
        setSelectedPerson(null);
        setSelectedDay(null);
    };

    // Filter transactions by active period
    const now = new Date();
    const filterDate = (() => {
        if (activePeriod === 'week') {
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return weekAgo;
        } else if (activePeriod === 'month') {
            const monthAgo = new Date(now);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return monthAgo;
        }
        return null; // 'all' - no filter
    })();

    // First filter by date period
    const periodFilteredTx = filterDate
        ? transactions.filter(tx => tx.parsedData.dateTime >= filterDate)
        : transactions;

    // Then filter by app mode (collections = received, payments = sent/paybill/buyGoods)
    const filteredTransactions = periodFilteredTx.filter(tx => {
        if (appMode === 'collections') {
            return tx.parsedData.type === 'received';
        } else {
            return ['sent', 'paybill', 'buyGoods'].includes(tx.parsedData.type);
        }
    });

    const filteredLedgerEntries = filterDate
        ? ledgerEntries.filter(e => {
            const tx = filteredTransactions.find(t => t.id === e.transactionId);
            return !!tx;
        })
        : ledgerEntries.filter(e => {
            const tx = filteredTransactions.find(t => t.id === e.transactionId);
            return !!tx;
        });

    // Calculate totals from filtered data
    const totalIn = filteredLedgerEntries.reduce((sum, e) => sum + e.amountPaid, 0);
    const totalOut = filteredLedgerEntries.reduce((sum, e) => sum + e.amountOwed, 0);
    const netBalance = totalOut; // Total still owed/owing

    // Animated counters - only animate once data is loaded
    const animatedTotalIn = useCountUp(totalIn, 1000, !isLoading);
    const animatedTotalOut = useCountUp(totalOut, 1000, !isLoading);
    const animatedNetBalance = useCountUp(netBalance, 1200, !isLoading);

    // Group transactions by day (using filtered transactions)
    const dayGroups: DayGroup[] = [];
    const sortedTxs = [...filteredTransactions].sort((a, b) =>
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

    // Group transactions by person (using filtered transactions)
    const personGroups: PersonGroup[] = [];
    filteredTransactions.forEach(tx => {
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

    // Count people who owe money (correct calculation from personGroups)
    const peopleWhoOwe = personGroups.filter(p => p.totalOwed > 0).length;

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

    // Handler functions for edit/delete
    const handleStartEdit = () => {
        if (selectedTransaction) {
            const expected = selectedTransaction.entry
                ? selectedTransaction.entry.amountPaid + selectedTransaction.entry.amountOwed
                : selectedTransaction.tx.parsedData.amount;
            setEditExpectedAmount(expected.toString());
            setEditNotes(selectedTransaction.tx.notes || '');
            setIsEditing(true);
        }
    };

    const handleSaveEdit = async () => {
        if (selectedTransaction) {
            try {
                const expectedAmount = parseFloat(editExpectedAmount) || 0;
                await updateTransaction(selectedTransaction.tx.id, {
                    expectedAmount,
                    notes: editNotes || undefined,
                });
                setIsEditing(false);
                setSelectedTransaction(null);
                await loadData();
            } catch (err) {
                console.error('Failed to update transaction:', err);
            }
        }
    };

    const handleDelete = async () => {
        if (selectedTransaction) {
            try {
                await deleteTransaction(selectedTransaction.tx.id);
                setShowDeleteConfirm(false);
                setSelectedTransaction(null);
                setSelectedPerson(null);
                setSelectedDay(null);
                await loadData();
            } catch (err) {
                console.error('Failed to delete transaction:', err);
            }
        }
    };

    // If day is selected, show full-page date detail view
    if (selectedDay) {
        return (
            <div className="person-page">
                <header className="person-page-header">
                    <button className="back-btn back-btn--icon" onClick={() => setSelectedDay(null)}>
                        <ArrowLeft size={24} />
                    </button>
                    <span className="person-page-title">{selectedDay.dateLabel}</span>
                </header>

                <div className="person-page-content">
                    {/* Date Summary */}
                    <div className="person-summary-cards">
                        <div className="person-stat-card person-stat-card--received">
                            <span className="stat-label">Received</span>
                            <span className="stat-value">Ksh {formatMoney(selectedDay.totalIn)}</span>
                        </div>
                        <div className="person-stat-card person-stat-card--owed">
                            <span className="stat-label">Sent Out</span>
                            <span className="stat-value">Ksh {formatMoney(selectedDay.totalOut)}</span>
                        </div>
                    </div>

                    {/* Transactions for this day */}
                    <section className="person-transactions">
                        <h3 className="section-label">
                            {selectedDay.transactions.length} Transaction{selectedDay.transactions.length !== 1 ? 's' : ''}
                        </h3>
                        <ul className="transaction-list">
                            {selectedDay.transactions.map(({ tx, entry }) => {
                                const isIn = tx.parsedData.type === 'received';
                                const amount = entry?.amountPaid || tx.parsedData.amount;
                                return (
                                    <li
                                        key={tx.id}
                                        className="transaction-item transaction-item--clickable"
                                        onClick={() => setSelectedTransaction({ tx, entry })}
                                    >
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
                                                <span className="tx-owed">Owes: {formatMoney(entry.amountOwed)}</span>
                                            )}
                                        </div>
                                        <ChevronRight size={16} className="tx-chevron" />
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                </div>

                {/* Transaction Detail Modal */}
                {selectedTransaction && (
                    <div className="tx-modal-overlay" onClick={() => setSelectedTransaction(null)}>
                        <div className="tx-modal" onClick={e => e.stopPropagation()}>
                            <button className="tx-modal-close" onClick={() => setSelectedTransaction(null)}>
                                ×
                            </button>

                            <div className="tx-modal-header">
                                <h3 className="tx-modal-title">Payment Details</h3>
                                <span className="tx-modal-subtitle">
                                    {selectedTransaction.tx.parsedData.counterparty.name || 'Transaction'}
                                </span>
                            </div>

                            <div className="tx-modal-amount">
                                <span className="tx-modal-amount-value money-in">
                                    Ksh {formatMoney(selectedTransaction.entry?.amountPaid || selectedTransaction.tx.parsedData.amount)}
                                </span>
                                <span className="tx-modal-amount-label">{appMode === 'collections' ? 'Amount Received' : 'Amount Paid'}</span>
                            </div>

                            <div className="tx-modal-section">
                                <h4 className="tx-modal-section-title">📋 Transaction Info</h4>
                                <div className="tx-modal-section-content">
                                    <div className="tx-modal-row">
                                        <span className="tx-modal-label">Date & Time</span>
                                        <span className="tx-modal-value">
                                            {new Intl.DateTimeFormat('en-KE', {
                                                weekday: 'short',
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            }).format(selectedTransaction.tx.parsedData.dateTime)}
                                        </span>
                                    </div>
                                    <div className="tx-modal-row">
                                        <span className="tx-modal-label">Reference Code</span>
                                        <code className="tx-modal-code">
                                            {selectedTransaction.tx.parsedData.transactionCode}
                                        </code>
                                    </div>
                                </div>
                            </div>

                            {selectedTransaction.entry && (
                                <div className="tx-modal-section">
                                    <h4 className="tx-modal-section-title">💰 Payment Breakdown</h4>
                                    <div className="tx-modal-section-content">
                                        <div className="tx-modal-row">
                                            <span className="tx-modal-label">Expected Amount</span>
                                            <span className="tx-modal-value">
                                                Ksh {formatMoney(selectedTransaction.entry.amountPaid + selectedTransaction.entry.amountOwed)}
                                            </span>
                                        </div>
                                        <div className="tx-modal-row">
                                            <span className="tx-modal-label">{appMode === 'collections' ? 'Amount Received' : 'Amount Paid'}</span>
                                            <span className="tx-modal-value money-in">
                                                Ksh {formatMoney(selectedTransaction.entry.amountPaid)}
                                            </span>
                                        </div>
                                        {selectedTransaction.entry.amountOwed > 0 && (
                                            <div className="tx-modal-row tx-modal-row--highlight">
                                                <span className="tx-modal-label">Outstanding Balance</span>
                                                <span className="tx-modal-value money-out">
                                                    Ksh {formatMoney(selectedTransaction.entry.amountOwed)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedTransaction.entry && selectedTransaction.entry.amountOwed === 0 && (
                                <div className="tx-modal-status tx-modal-status--paid">
                                    ✓ Payment Complete
                                </div>
                            )}
                            {selectedTransaction.entry && selectedTransaction.entry.amountOwed > 0 && (
                                <div className="tx-modal-status tx-modal-status--pending">
                                    ⏳ Partial Payment
                                </div>
                            )}

                            {/* Edit Form */}
                            {isEditing ? (
                                <div className="tx-modal-edit">
                                    <div className="tx-modal-section">
                                        <h4 className="tx-modal-section-title">✏️ Edit Transaction</h4>
                                        <div className="tx-modal-section-content">
                                            <div className="tx-modal-field">
                                                <label>Expected Amount (Ksh)</label>
                                                <input
                                                    type="number"
                                                    value={editExpectedAmount}
                                                    onChange={e => setEditExpectedAmount(e.target.value)}
                                                    className="tx-modal-input"
                                                />
                                            </div>
                                            <div className="tx-modal-field">
                                                <label>Notes</label>
                                                <input
                                                    type="text"
                                                    value={editNotes}
                                                    onChange={e => setEditNotes(e.target.value)}
                                                    placeholder="Add a note..."
                                                    className="tx-modal-input"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="tx-modal-actions">
                                        <button className="tx-modal-btn tx-modal-btn--cancel" onClick={() => setIsEditing(false)}>
                                            Cancel
                                        </button>
                                        <button className="tx-modal-btn tx-modal-btn--save" onClick={handleSaveEdit}>
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            ) : showDeleteConfirm ? (
                                <div className="tx-modal-delete-confirm">
                                    <p>Are you sure you want to delete this transaction?</p>
                                    <div className="tx-modal-actions">
                                        <button className="tx-modal-btn tx-modal-btn--cancel" onClick={() => setShowDeleteConfirm(false)}>
                                            Cancel
                                        </button>
                                        <button className="tx-modal-btn tx-modal-btn--delete" onClick={handleDelete}>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="tx-modal-actions">
                                    <button className="tx-modal-btn tx-modal-btn--edit" onClick={handleStartEdit}>
                                        <Edit3 size={16} />
                                        Edit
                                    </button>
                                    <button className="tx-modal-btn tx-modal-btn--delete" onClick={() => setShowDeleteConfirm(true)}>
                                        <Trash2 size={16} />
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // If person is selected, show full-page detail view
    if (selectedPerson) {
        return (
            <div className="person-page">
                <header className="person-page-header">
                    <button className="back-btn back-btn--icon" onClick={() => setSelectedPerson(null)}>
                        <ArrowLeft size={24} />
                    </button>
                    <span className="person-page-title">{selectedPerson.name}</span>
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
                            <span className="stat-label">{appMode === 'collections' ? 'Total Received' : 'Total Paid'}</span>
                            <span className="stat-value">Ksh {formatMoney(selectedPerson.totalReceived)}</span>
                        </div>
                        <div className="person-stat-card person-stat-card--owed">
                            <span className="stat-label">{appMode === 'collections' ? 'Still Owed' : 'Outstanding'}</span>
                            <span className="stat-value">Ksh {formatMoney(selectedPerson.totalOwed)}</span>
                        </div>
                    </div>

                    {/* Payment Timeline - Line Chart */}
                    {monthlyBreakdown.length > 0 && (
                        <section className="monthly-breakdown">
                            <h3 className="section-label">Payment Timeline</h3>
                            <div className="person-line-chart-container">
                                <svg viewBox="0 0 300 120" className="person-line-chart" preserveAspectRatio="xMidYMid meet">
                                    {/* Grid lines */}
                                    <line x1="30" y1="10" x2="30" y2="90" stroke="#e5e5e5" strokeWidth="1" />
                                    <line x1="30" y1="90" x2="290" y2="90" stroke="#e5e5e5" strokeWidth="1" />
                                    {[0, 33, 66, 100].map((pct, i) => (
                                        <line key={i} x1="30" y1={90 - pct * 0.8} x2="290" y2={90 - pct * 0.8} stroke="#f0f0f0" strokeWidth="1" />
                                    ))}

                                    {/* Line path */}
                                    {(() => {
                                        const maxReceived = Math.max(...monthlyBreakdown.map(x => x.received), 1);
                                        const spacing = monthlyBreakdown.length > 1 ? 240 / (monthlyBreakdown.length - 1) : 0;
                                        const points = monthlyBreakdown.map((m, idx) => {
                                            const x = 50 + idx * spacing;
                                            const y = 90 - (m.received / maxReceived) * 70;
                                            return { x, y, data: m };
                                        });
                                        const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                                        return (
                                            <>
                                                {/* Area fill */}
                                                <path
                                                    d={`${pathD} L ${points[points.length - 1]?.x || 0} 90 L ${points[0]?.x || 0} 90 Z`}
                                                    fill="url(#personLineGradient)"
                                                    opacity="0.3"
                                                />
                                                {/* Line */}
                                                <path d={pathD} fill="none" stroke="#0b6e4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                {/* Data points */}
                                                {points.map((p, idx) => (
                                                    <g key={idx}>
                                                        <circle cx={p.x} cy={p.y} r="5" fill="white" stroke="#0b6e4f" strokeWidth="2" />
                                                        {p.data.received > 0 && (
                                                            <circle cx={p.x} cy={p.y} r="2.5" fill="#0b6e4f" />
                                                        )}
                                                    </g>
                                                ))}
                                            </>
                                        );
                                    })()}

                                    {/* Gradient definition */}
                                    <defs>
                                        <linearGradient id="personLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" stopColor="#0b6e4f" stopOpacity="0.4" />
                                            <stop offset="100%" stopColor="#0b6e4f" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                </svg>

                                {/* X-axis labels */}
                                <div className="person-line-chart-labels">
                                    {monthlyBreakdown.map((m, idx) => (
                                        <span key={idx} className="person-line-chart-label">{m.month}</span>
                                    ))}
                                </div>
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
                                        <li
                                            key={tx.id}
                                            className="transaction-item transaction-item--clickable"
                                            onClick={() => setSelectedTransaction({ tx, entry })}
                                        >
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
                                            <ChevronRight size={16} className="tx-chevron" />
                                        </li>
                                    );
                                })}
                        </ul>
                    </section>
                </div>

                {/* Transaction Detail Modal */}
                {selectedTransaction && (
                    <div className="tx-modal-overlay" onClick={() => setSelectedTransaction(null)}>
                        <div className="tx-modal" onClick={e => e.stopPropagation()}>
                            <button className="tx-modal-close" onClick={() => setSelectedTransaction(null)}>
                                ×
                            </button>

                            {/* Header */}
                            <div className="tx-modal-header">
                                <h3 className="tx-modal-title">Payment Details</h3>
                                <span className="tx-modal-subtitle">
                                    {selectedTransaction.tx.parsedData.counterparty.name || 'Transaction'}
                                </span>
                            </div>

                            {/* Amount Hero */}
                            <div className="tx-modal-amount">
                                <span className="tx-modal-amount-value money-in">
                                    Ksh {formatMoney(selectedTransaction.entry?.amountPaid || selectedTransaction.tx.parsedData.amount)}
                                </span>
                                <span className="tx-modal-amount-label">{appMode === 'collections' ? 'Amount Received' : 'Amount Paid'}</span>
                            </div>

                            {/* Transaction Info Section */}
                            <div className="tx-modal-section">
                                <h4 className="tx-modal-section-title">📋 Transaction Info</h4>
                                <div className="tx-modal-section-content">
                                    <div className="tx-modal-row">
                                        <span className="tx-modal-label">Date & Time</span>
                                        <span className="tx-modal-value">
                                            {new Intl.DateTimeFormat('en-KE', {
                                                weekday: 'short',
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            }).format(selectedTransaction.tx.parsedData.dateTime)}
                                        </span>
                                    </div>
                                    <div className="tx-modal-row">
                                        <span className="tx-modal-label">Reference Code</span>
                                        <code className="tx-modal-code">
                                            {selectedTransaction.tx.parsedData.transactionCode}
                                        </code>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Breakdown Section */}
                            {selectedTransaction.entry && (
                                <div className="tx-modal-section">
                                    <h4 className="tx-modal-section-title">💰 Payment Breakdown</h4>
                                    <div className="tx-modal-section-content">
                                        <div className="tx-modal-row">
                                            <span className="tx-modal-label">Expected Amount</span>
                                            <span className="tx-modal-value">
                                                Ksh {formatMoney(selectedTransaction.entry.amountPaid + selectedTransaction.entry.amountOwed)}
                                            </span>
                                        </div>
                                        <div className="tx-modal-row">
                                            <span className="tx-modal-label">{appMode === 'collections' ? 'Amount Received' : 'Amount Paid'}</span>
                                            <span className="tx-modal-value money-in">
                                                Ksh {formatMoney(selectedTransaction.entry.amountPaid)}
                                            </span>
                                        </div>
                                        {selectedTransaction.entry.amountOwed > 0 && (
                                            <div className="tx-modal-row tx-modal-row--highlight">
                                                <span className="tx-modal-label">Outstanding Balance</span>
                                                <span className="tx-modal-value money-out">
                                                    Ksh {formatMoney(selectedTransaction.entry.amountOwed)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Status Badge */}
                            {selectedTransaction.entry && selectedTransaction.entry.amountOwed === 0 && (
                                <div className="tx-modal-status tx-modal-status--paid">
                                    ✓ Payment Complete
                                </div>
                            )}
                            {selectedTransaction.entry && selectedTransaction.entry.amountOwed > 0 && (
                                <div className="tx-modal-status tx-modal-status--pending">
                                    ⏳ Partial Payment
                                </div>
                            )}

                            {/* Edit Form */}
                            {isEditing ? (
                                <div className="tx-modal-edit">
                                    <div className="tx-modal-section">
                                        <h4 className="tx-modal-section-title">✏️ Edit Transaction</h4>
                                        <div className="tx-modal-section-content">
                                            <div className="tx-modal-field">
                                                <label>Expected Amount (Ksh)</label>
                                                <input
                                                    type="number"
                                                    value={editExpectedAmount}
                                                    onChange={e => setEditExpectedAmount(e.target.value)}
                                                    className="tx-modal-input"
                                                />
                                            </div>
                                            <div className="tx-modal-field">
                                                <label>Notes</label>
                                                <input
                                                    type="text"
                                                    value={editNotes}
                                                    onChange={e => setEditNotes(e.target.value)}
                                                    placeholder="Add a note..."
                                                    className="tx-modal-input"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="tx-modal-actions">
                                        <button className="tx-modal-btn tx-modal-btn--cancel" onClick={() => setIsEditing(false)}>
                                            Cancel
                                        </button>
                                        <button className="tx-modal-btn tx-modal-btn--save" onClick={handleSaveEdit}>
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            ) : showDeleteConfirm ? (
                                <div className="tx-modal-delete-confirm">
                                    <p>Are you sure you want to delete this transaction?</p>
                                    <div className="tx-modal-actions">
                                        <button className="tx-modal-btn tx-modal-btn--cancel" onClick={() => setShowDeleteConfirm(false)}>
                                            Cancel
                                        </button>
                                        <button className="tx-modal-btn tx-modal-btn--delete" onClick={handleDelete}>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="tx-modal-actions">
                                    <button className="tx-modal-btn tx-modal-btn--edit" onClick={handleStartEdit}>
                                        <Edit3 size={16} />
                                        Edit
                                    </button>
                                    <button className="tx-modal-btn tx-modal-btn--delete" onClick={() => setShowDeleteConfirm(true)}>
                                        <Trash2 size={16} />
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
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

            {/* Mode Selector */}
            <div className="mode-selector">
                <button
                    className={`mode-btn ${appMode === 'collections' ? 'mode-btn--active mode-btn--collections' : ''}`}
                    onClick={() => handleModeChange('collections')}
                >
                    <Wallet size={18} />
                    <span>Collections</span>
                </button>
                <button
                    className={`mode-btn ${appMode === 'payments' ? 'mode-btn--active mode-btn--payments' : ''}`}
                    onClick={() => handleModeChange('payments')}
                >
                    <CreditCard size={18} />
                    <span>Payments</span>
                </button>
            </div>

            {/* Net Balance Hero */}
            {!isLoading && (
                <section className={`net-balance-hero ${appMode === 'payments' ? 'net-balance-hero--payments' : ''}`}>
                    {netBalance > 0 ? (
                        <>
                            <span className="hero-label">
                                {appMode === 'collections' ? "You're owed" : "You paid"}
                            </span>
                            <span className={`hero-amount ${appMode === 'collections' ? 'hero-amount--owed' : 'hero-amount--paid'}`}>
                                Ksh {formatMoney(animatedNetBalance)}
                            </span>
                            {peopleWhoOwe > 0 && (
                                <span className="hero-context">
                                    {appMode === 'collections'
                                        ? `from ${peopleWhoOwe} ${peopleWhoOwe === 1 ? 'person' : 'people'}`
                                        : `to ${peopleWhoOwe} ${peopleWhoOwe === 1 ? 'person' : 'people'}`
                                    }
                                </span>
                            )}
                        </>
                    ) : (
                        <>
                            <span className="hero-label">
                                {appMode === 'collections' ? "All paid up" : "No payments"}
                            </span>
                            <span className="hero-amount hero-amount--clear">✓</span>
                            <span className="hero-context">
                                {appMode === 'collections' ? "No outstanding debts" : "No outgoing payments"}
                            </span>
                        </>
                    )}
                </section>
            )}

            {/* Summary Cards - CountPesa Style */}
            <section className="summary-section">
                <div className="summary-cards">
                    <div className={`summary-card ${appMode === 'collections' ? 'summary-card--in' : 'summary-card--out-primary'}`}>
                        <div className="summary-card-header">
                            {appMode === 'collections' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                            <span>{appMode === 'collections' ? 'Received' : 'Paid Out'}</span>
                        </div>
                        <div className="summary-card-amount">
                            <span className="currency">Ksh</span>
                            <span className={`money money-lg ${appMode === 'collections' ? 'money-in' : 'money-out'}`}>{formatMoney(animatedTotalIn)}</span>
                        </div>
                    </div>

                    <div className={`summary-card ${appMode === 'collections' ? 'summary-card--out' : 'summary-card--owe'}`}>
                        <div className="summary-card-header">
                            {appMode === 'collections' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                            <span>{appMode === 'collections' ? 'Still Owed' : 'They Owe'}</span>
                        </div>
                        <div className="summary-card-amount">
                            <span className="currency">Ksh</span>
                            <span className={`money money-lg ${appMode === 'collections' ? 'money-out' : 'money-debt'}`}>{formatMoney(animatedTotalOut)}</span>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="search-bar">
                    <Search size={18} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search people..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                    {searchQuery && (
                        <button className="search-clear" onClick={() => setSearchQuery('')}>
                            <X size={16} />
                        </button>
                    )}
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
                    <span>{appMode === 'collections' ? 'Record Collection' : 'Record Payment'}</span>
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
                    <div className="skeleton-loading-state">
                        <SkeletonPersonCard />
                        <SkeletonPersonCard />
                        <SkeletonPersonCard />
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-illustration">
                            <div className="empty-icon-circle">
                                <FileText size={40} strokeWidth={1.5} />
                            </div>
                        </div>

                        <h3 className="empty-title">
                            {appMode === 'collections' ? 'No collections yet' : 'No payments yet'}
                        </h3>
                        <p className="empty-description">
                            {appMode === 'collections'
                                ? 'Start tracking your M-Pesa transactions to see who owes you money'
                                : 'Start tracking your M-Pesa payments to see who you\'ve paid'
                            }
                        </p>

                        <button className="empty-cta" onClick={onRecordPayment}>
                            <Plus size={20} strokeWidth={2.5} />
                            Record Your First Payment
                        </button>

                        <div className="empty-tips">
                            <h4>💡 Getting Started</h4>
                            <ul>
                                <li>📱 Paste an M-Pesa confirmation message</li>
                                <li>📄 Or upload a PDF statement</li>
                                <li>👥 Track multiple people at once</li>
                            </ul>
                        </div>
                    </div>
                ) : viewMode === 'person' ? (
                    /* Person View */
                    <div className="person-groups">
                        {personGroups
                            .filter(person =>
                                !searchQuery ||
                                person.name.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .map((person, idx) => (
                                <div
                                    key={idx}
                                    className={`person-card ${appMode === 'payments' ? 'person-card--payments' : ''}`}
                                    onClick={() => setSelectedPerson(person)}
                                >
                                    <div className="person-info">
                                        <span className="person-name">{person.name}</span>
                                        <span className="person-count">
                                            {person.transactions.length} payment{person.transactions.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <div className="person-totals">
                                        <span className={`person-received ${appMode === 'payments' ? 'person-received--payments' : ''}`}>
                                            Ksh {formatMoney(person.totalReceived)}
                                        </span>
                                        {person.totalOwed > 0 && (
                                            <span className={`person-owed ${appMode === 'payments' ? 'person-owed--payments' : ''}`}>
                                                {appMode === 'collections' ? 'Owes' : 'You Paid'}: Ksh {formatMoney(person.totalOwed)}
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
                                <div
                                    className="day-header day-header--clickable"
                                    onClick={() => setSelectedDay(group)}
                                >
                                    <span className="day-label">{group.dateLabel}</span>
                                    <div className="day-totals">
                                        {group.totalIn > 0 && (
                                            <span className="day-total day-total--in">+{formatMoney(group.totalIn)}</span>
                                        )}
                                        {group.totalOut > 0 && (
                                            <span className="day-total day-total--out">-{formatMoney(group.totalOut)}</span>
                                        )}
                                    </div>
                                    <ChevronRight size={16} className="day-chevron" />
                                </div>

                                <ul className="transaction-list">
                                    {group.transactions.map(({ tx, entry }) => {
                                        const isIn = tx.parsedData.type === 'received';
                                        const amount = entry?.amountPaid || tx.parsedData.amount;

                                        return (
                                            <li
                                                key={tx.id}
                                                className="transaction-item transaction-item--clickable"
                                                onClick={() => setSelectedTransaction({ tx, entry })}
                                            >
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
                                                        <span className="tx-owed">Owes: {formatMoney(entry.amountOwed)}</span>
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
