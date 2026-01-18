/**
 * Home Page - CountPesa Inspired
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, ArrowDownLeft, ArrowUpRight, Calendar, ChevronRight, Users, ArrowLeft, FileText, Trash2, Edit3, Search, X, Wallet, CreditCard, LayoutGrid, SlidersHorizontal } from 'lucide-react';
import { getTransactionsByUser, getLedgerEntriesByTransaction, updateTransaction, deleteTransaction, isSamePerson, getCanonicalName } from '../storage';
import { useCountUp } from '../hooks';
import { SkeletonPersonCard } from '../components/ui';
import { getCategoryById } from '../constants/categories';
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
    totalReceived: number; // For display (Collections mode uses this)
    totalOwed: number; // Outstanding debt
    totalCollected: number; // Money received from them (collections)
    totalPaid: number; // Money paid to them (payments)
    primaryType: 'collection' | 'payment'; // For Overview mode
    lastTransactionDate?: Date; // Most recent transaction
}

export function HomePage({ onRecordPayment }: HomePageProps) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [appMode, setAppMode] = useState<'collections' | 'payments' | 'overview'>(() => {
        const saved = localStorage.getItem('mdaftari_app_mode');
        if (saved === 'payments') return 'payments';
        if (saved === 'overview') return 'overview';
        return 'collections';
    });
    const [activePeriod, setActivePeriod] = useState<'week' | 'month' | 'all'>('all');
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
    const [historySortOrder, setHistorySortOrder] = useState<'oldest' | 'newest'>('oldest');

    // Advanced search filters
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [filterAmountMin, setFilterAmountMin] = useState('');
    const [filterAmountMax, setFilterAmountMax] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'complete' | 'partial'>('all');
    const [filterType, setFilterType] = useState<'all' | 'received' | 'sent'>('all');

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
    const handleModeChange = (mode: 'collections' | 'payments' | 'overview') => {
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

    // Then filter by app mode (collections = received, payments = sent/paybill/buyGoods, overview = all)
    const modeFilteredTx = periodFilteredTx.filter(tx => {
        if (appMode === 'collections') {
            return tx.parsedData.type === 'received';
        } else if (appMode === 'payments') {
            return ['sent', 'paybill', 'buyGoods'].includes(tx.parsedData.type);
        }
        // overview mode - show all
        return true;
    });

    // Apply advanced filters (amount range, status, type)
    const filteredTransactions = modeFilteredTx.filter(tx => {
        const entry = ledgerEntries.find(e => e.transactionId === tx.id);
        const amount = entry?.amountPaid || tx.parsedData.amount;

        // Amount range filter
        if (filterAmountMin && amount < parseFloat(filterAmountMin)) return false;
        if (filterAmountMax && amount > parseFloat(filterAmountMax)) return false;

        // Status filter (complete = no amount owed, partial = some owed)
        if (filterStatus !== 'all') {
            const isComplete = !entry || entry.amountOwed === 0;
            if (filterStatus === 'complete' && !isComplete) return false;
            if (filterStatus === 'partial' && isComplete) return false;
        }

        // Type filter (received/sent)
        if (filterType !== 'all') {
            const isReceived = tx.parsedData.type === 'received';
            if (filterType === 'received' && !isReceived) return false;
            if (filterType === 'sent' && isReceived) return false;
        }

        return true;
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

    // Overview mode: Calculate separate totals for collections and payments
    const collectionsTransactions = periodFilteredTx.filter(tx => tx.parsedData.type === 'received');
    const paymentsTransactions = periodFilteredTx.filter(tx => ['sent', 'paybill', 'buyGoods'].includes(tx.parsedData.type));

    const collectionsEntries = ledgerEntries.filter(e => collectionsTransactions.some(t => t.id === e.transactionId));
    const paymentsEntries = ledgerEntries.filter(e => paymentsTransactions.some(t => t.id === e.transactionId));

    const collectionsReceived = collectionsEntries.reduce((sum, e) => sum + e.amountPaid, 0);
    const collectionsOwed = collectionsEntries.reduce((sum, e) => sum + e.amountOwed, 0); // They owe you
    const paymentsPaid = paymentsEntries.reduce((sum, e) => sum + e.amountPaid, 0);
    const paymentsOwed = paymentsEntries.reduce((sum, e) => sum + e.amountOwed, 0); // You owe them

    const overviewNetBalance = (collectionsReceived + collectionsOwed) - (paymentsPaid + paymentsOwed);

    // Animated counters - only animate once data is loaded
    const animatedTotalIn = useCountUp(totalIn, 1000, !isLoading);
    const animatedTotalOut = useCountUp(totalOut, 1000, !isLoading);
    const animatedNetBalance = useCountUp(netBalance, 1200, !isLoading);
    const animatedCollectionsReceived = useCountUp(collectionsReceived, 1000, !isLoading);
    const animatedCollectionsOwed = useCountUp(collectionsOwed, 1000, !isLoading);
    const animatedPaymentsPaid = useCountUp(paymentsPaid, 1000, !isLoading);
    const animatedPaymentsOwed = useCountUp(paymentsOwed, 1000, !isLoading);
    const animatedOverviewNet = useCountUp(overviewNetBalance, 1200, !isLoading);

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
    // Uses smart matching: same phone, case-insensitive name, or merge mappings
    const personGroups: PersonGroup[] = [];
    filteredTransactions.forEach(tx => {
        const rawName = tx.parsedData.counterparty.name || 'Unknown';
        const phone = tx.parsedData.counterparty.phone;
        const isCollection = tx.parsedData.type === 'received';

        // Use canonical name (resolves merges) for display
        const name = getCanonicalName(rawName);

        // Find existing group using smart matching
        let group = personGroups.find(g =>
            isSamePerson(g.name, g.phone, name, phone)
        );

        if (!group) {
            group = {
                name,
                phone,
                transactions: [],
                totalReceived: 0,
                totalOwed: 0,
                totalCollected: 0,
                totalPaid: 0,
                primaryType: isCollection ? 'collection' : 'payment',
                lastTransactionDate: tx.parsedData.dateTime,
            };
            personGroups.push(group);
        }

        const entry = ledgerEntries.find(e => e.transactionId === tx.id);
        const amount = entry?.amountPaid || tx.parsedData.amount;
        group.transactions.push({ tx, entry });

        // Track collections and payments separately
        if (isCollection) {
            group.totalCollected += amount;
        } else {
            group.totalPaid += amount;
        }

        // totalReceived is used for display in single-mode views
        group.totalReceived += amount;
        group.totalOwed += entry?.amountOwed || 0;

        // Update last transaction date if this is more recent
        if (!group.lastTransactionDate || tx.parsedData.dateTime > group.lastTransactionDate) {
            group.lastTransactionDate = tx.parsedData.dateTime;
        }
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
        // Calculate people breakdown for this day
        const peopleOnDay: { name: string; phone?: string; totalIn: number; totalOut: number; count: number }[] = [];
        selectedDay.transactions.forEach(({ tx, entry }) => {
            const rawName = tx.parsedData.counterparty.name || tx.parsedData.counterparty.phone || 'Unknown';
            const phone = tx.parsedData.counterparty.phone;
            const name = getCanonicalName(rawName);
            const isIn = tx.parsedData.type === 'received';
            const amount = entry?.amountPaid || tx.parsedData.amount;

            // Use smart matching for deduplication
            let person = peopleOnDay.find(p => isSamePerson(p.name, p.phone, name, phone));
            if (!person) {
                person = { name, phone, totalIn: 0, totalOut: 0, count: 0 };
                peopleOnDay.push(person);
            }
            person.count++;
            if (isIn) person.totalIn += amount;
            else person.totalOut += amount;
        });

        // Calculate outstanding for this day
        const totalOwedOnDay = selectedDay.transactions.reduce((sum, { entry }) => sum + (entry?.amountOwed || 0), 0);
        const netPosition = selectedDay.totalIn - selectedDay.totalOut;

        // Get day of week
        const dayOfWeek = selectedDay.transactions[0]
            ? new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(selectedDay.transactions[0].tx.parsedData.dateTime)
            : '';

        return (
            <div className="person-page">
                <header className="person-page-header">
                    <button className="back-btn back-btn--icon" onClick={() => setSelectedDay(null)}>
                        <ArrowLeft size={24} />
                    </button>
                    <span className="person-page-title">{selectedDay.dateLabel}</span>
                </header>

                <div className="person-page-content">
                    {/* Date Hero */}
                    <div className="person-hero">
                        <div className="date-hero-icon">
                            <Calendar size={40} />
                        </div>
                        <h1 className="person-hero-name">{selectedDay.dateLabel}</h1>
                        <p className="person-hero-phone">{dayOfWeek}</p>
                        <div className="person-hero-meta">
                            <span>{selectedDay.transactions.length} transaction{selectedDay.transactions.length !== 1 ? 's' : ''}</span>
                            <span>•</span>
                            <span>{peopleOnDay.length} {peopleOnDay.length === 1 ? 'person' : 'people'}</span>
                        </div>
                    </div>

                    {/* Day Summary Banner */}
                    <div className={`relationship-banner ${netPosition < 0 ? 'relationship-banner--payments' : ''}`}>
                        <div className="relationship-text">
                            {appMode === 'collections' ? (
                                <span>Collected <strong>Ksh {formatMoney(selectedDay.totalIn)}</strong> on this day</span>
                            ) : appMode === 'payments' ? (
                                <span>Paid out <strong>Ksh {formatMoney(selectedDay.totalOut)}</strong> on this day</span>
                            ) : (
                                <span>Net {netPosition >= 0 ? 'Income' : 'Expense'}: <strong>Ksh {formatMoney(Math.abs(netPosition))}</strong></span>
                            )}
                        </div>
                        {totalOwedOnDay > 0 && (
                            <div className="day-outstanding-note">
                                Outstanding from this day: <strong>Ksh {formatMoney(totalOwedOnDay)}</strong>
                            </div>
                        )}
                    </div>

                    {/* Summary Cards */}
                    <div className="person-summary-cards">
                        <div className="person-stat-card person-stat-card--received">
                            <span className="stat-label">{appMode === 'payments' ? 'Received' : 'Collected'}</span>
                            <span className="stat-value">Ksh {formatMoney(selectedDay.totalIn)}</span>
                            <span className="stat-subtitle">Money coming in</span>
                        </div>
                        <div className="person-stat-card person-stat-card--owed">
                            <span className="stat-label">{appMode === 'payments' ? 'Paid Out' : 'Sent Out'}</span>
                            <span className="stat-value">Ksh {formatMoney(selectedDay.totalOut)}</span>
                            <span className="stat-subtitle">Money going out</span>
                        </div>
                    </div>

                    {/* People Breakdown */}
                    {peopleOnDay.length > 0 && (
                        <section className="day-people-section">
                            <h3 className="section-label">People on This Day</h3>
                            <div className="day-people-grid">
                                {peopleOnDay.slice(0, 4).map(person => (
                                    <div key={person.name} className="day-person-chip">
                                        <div className="day-person-avatar">
                                            {person.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="day-person-info">
                                            <span className="day-person-name">{person.name.split(' ')[0]}</span>
                                            <span className="day-person-amount">
                                                {person.totalIn > person.totalOut
                                                    ? `+${formatMoney(person.totalIn - person.totalOut)}`
                                                    : `-${formatMoney(person.totalOut - person.totalIn)}`}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {peopleOnDay.length > 4 && (
                                    <div className="day-person-chip day-person-chip--more">
                                        +{peopleOnDay.length - 4} more
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Transactions for this day */}
                    <section className="person-transactions">
                        <div className="section-header-row">
                            <h3 className="section-label">
                                {selectedDay.transactions.length} {appMode === 'collections' ? 'Collection' : 'Transaction'}{selectedDay.transactions.length !== 1 ? 's' : ''}
                            </h3>
                            <button
                                className="sort-toggle-btn"
                                onClick={() => setHistorySortOrder(prev => prev === 'oldest' ? 'newest' : 'oldest')}
                            >
                                {historySortOrder === 'oldest' ? '↑ Oldest' : '↓ Newest'}
                            </button>
                        </div>
                        <ul className="transaction-list">
                            {selectedDay.transactions
                                .slice()
                                .sort((a, b) => {
                                    const timeA = a.tx.parsedData.dateTime.getTime();
                                    const timeB = b.tx.parsedData.dateTime.getTime();
                                    const amountA = a.entry?.amountPaid || a.tx.parsedData.amount;
                                    const amountB = b.entry?.amountPaid || b.tx.parsedData.amount;

                                    if (historySortOrder === 'oldest') {
                                        return timeA !== timeB ? timeA - timeB : amountA - amountB;
                                    } else {
                                        return timeB !== timeA ? timeB - timeA : amountB - amountA;
                                    }
                                })
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
                                                <span className="tx-name">
                                                    {tx.parsedData.counterparty.name || tx.parsedData.counterparty.phone || 'Payment'}
                                                </span>
                                                <div className="tx-meta">
                                                    <code className="tx-code">{tx.parsedData.transactionCode}</code>
                                                    {tx.category && tx.category !== 'general' && (
                                                        <span className="tx-category" title={getCategoryById(tx.category)?.label}>
                                                            {getCategoryById(tx.category)?.icon}
                                                        </span>
                                                    )}
                                                    <span className="tx-time">{formatTime(tx.parsedData.dateTime)}</span>
                                                </div>
                                            </div>
                                            <div className="tx-amount-wrapper">
                                                <span className={`tx-amount ${isIn ? 'money-in' : 'money-out'}`}>
                                                    {isIn ? '+' : '-'}Ksh {formatMoney(amount)}
                                                </span>
                                                {entry && entry.amountOwed > 0 && (
                                                    <span className="tx-owed">{appMode === 'payments' ? 'You Owe' : 'Owes'}: {formatMoney(entry.amountOwed)}</span>
                                                )}
                                                {tx.parsedData.transactionCost && tx.parsedData.transactionCost > 0 && (
                                                    <span className="tx-fee">Fee: Ksh {formatMoney(tx.parsedData.transactionCost)}</span>
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
                                            <span className="tx-modal-label">{appMode === 'payments' ? 'Total Owed' : 'Expected Amount'}</span>
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
                                                <label>{appMode === 'payments' ? 'Total Owed (Ksh)' : 'Expected Amount (Ksh)'}</label>
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
                    {/* Hero with Avatar */}
                    <div className="person-hero">
                        <div className="person-avatar">
                            {selectedPerson.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <h1 className="person-hero-name">{selectedPerson.name}</h1>
                        {selectedPerson.phone && (
                            <p className="person-hero-phone">{selectedPerson.phone}</p>
                        )}
                        <div className="person-hero-meta">
                            <span>{selectedPerson.transactions.length} transaction{selectedPerson.transactions.length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>

                    {/* Relationship Summary Banner */}
                    {selectedPerson.totalOwed > 0 && (
                        <div className={`relationship-banner ${appMode === 'payments' ? 'relationship-banner--payments' : ''}`}>
                            <div className="relationship-text">
                                {appMode === 'collections' ? (
                                    <span><strong>{selectedPerson.name}</strong> owes you <strong>Ksh {formatMoney(selectedPerson.totalOwed)}</strong></span>
                                ) : appMode === 'payments' ? (
                                    <span>You owe <strong>{selectedPerson.name}</strong> <strong>Ksh {formatMoney(selectedPerson.totalOwed)}</strong></span>
                                ) : (
                                    <span>Outstanding balance: <strong>Ksh {formatMoney(selectedPerson.totalOwed)}</strong></span>
                                )}
                            </div>
                            {/* Progress Bar */}
                            {selectedPerson.totalReceived > 0 && (() => {
                                const total = selectedPerson.totalReceived + selectedPerson.totalOwed;
                                const percent = Math.round((selectedPerson.totalReceived / total) * 100);
                                return (
                                    <div className="progress-section">
                                        <div className="progress-bar-container">
                                            <div
                                                className={`progress-bar-fill ${appMode === 'payments' ? 'progress-bar-fill--payments' : ''}`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                        <span className="progress-label">
                                            {percent}% {appMode === 'collections' ? 'collected' : 'paid'}
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* Summary Cards */}
                    <div className="person-summary-cards">
                        {appMode === 'overview' ? (
                            <>
                                <div className="person-stat-card person-stat-card--received">
                                    <span className="stat-label">Collected</span>
                                    <span className="stat-value">Ksh {formatMoney(selectedPerson.totalCollected)}</span>
                                    <span className="stat-subtitle">Money received from {selectedPerson.name.split(' ')[0]}</span>
                                </div>
                                <div className="person-stat-card person-stat-card--owed">
                                    <span className="stat-label">Paid Out</span>
                                    <span className="stat-value">Ksh {formatMoney(selectedPerson.totalPaid)}</span>
                                    <span className="stat-subtitle">Payments made to {selectedPerson.name.split(' ')[0]}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="person-stat-card person-stat-card--received">
                                    <span className="stat-label">{appMode === 'collections' ? 'Total Collected' : 'Total Paid'}</span>
                                    <span className="stat-value">Ksh {formatMoney(selectedPerson.totalReceived)}</span>
                                    <span className="stat-subtitle">
                                        {appMode === 'collections'
                                            ? `Received from ${selectedPerson.name.split(' ')[0]}`
                                            : `Paid to ${selectedPerson.name.split(' ')[0]}`}
                                    </span>
                                </div>
                                <div className="person-stat-card person-stat-card--owed">
                                    <span className="stat-label">{appMode === 'collections' ? 'They Owe You' : 'You Owe'}</span>
                                    <span className="stat-value">Ksh {formatMoney(selectedPerson.totalOwed)}</span>
                                    <span className="stat-subtitle">
                                        {appMode === 'collections'
                                            ? 'Outstanding balance to collect'
                                            : 'Remaining balance to pay'}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Payment Timeline - Transaction Accumulation Chart */}
                    {selectedPerson.transactions.length > 0 && (() => {
                        // Sort transactions chronologically
                        const sortedTxs = [...selectedPerson.transactions]
                            .sort((a, b) => a.tx.parsedData.dateTime.getTime() - b.tx.parsedData.dateTime.getTime());

                        // Build accumulation data
                        let runningTotal = 0;
                        const accumulationData = sortedTxs.map((item, idx) => {
                            const amount = item.entry?.amountPaid || item.tx.parsedData.amount;
                            runningTotal += amount;
                            const dateStr = new Intl.DateTimeFormat('en-KE', {
                                day: 'numeric', month: 'short'
                            }).format(item.tx.parsedData.dateTime);
                            return {
                                label: dateStr,
                                amount,
                                cumulative: runningTotal,
                                idx
                            };
                        });

                        const maxCumulative = runningTotal || 1;
                        const chartWidth = 280;
                        const chartHeight = 100;
                        const padding = 30;
                        const barWidth = Math.min(40, (chartWidth - padding) / accumulationData.length - 8);

                        return (
                            <section className="monthly-breakdown">
                                <h3 className="section-label">{appMode === 'collections' ? 'Collection Accumulation' : 'Payment Accumulation'}</h3>
                                <div className="person-line-chart-container">
                                    {/* Bar chart showing accumulation */}
                                    <div className="accumulation-chart">
                                        {accumulationData.map((item, idx) => {
                                            const heightPct = (item.cumulative / maxCumulative) * 100;
                                            const barHeightPct = (item.amount / maxCumulative) * 100;
                                            return (
                                                <div key={idx} className="accumulation-bar-wrapper">
                                                    <div className="accumulation-bar-container">
                                                        {/* Cumulative fill (background) */}
                                                        <div
                                                            className="accumulation-fill"
                                                            style={{ height: `${heightPct}%` }}
                                                        />
                                                        {/* Individual transaction bar (foreground) */}
                                                        <div
                                                            className={`accumulation-bar ${appMode === 'payments' ? 'accumulation-bar--payment' : ''}`}
                                                            style={{ height: `${barHeightPct}%` }}
                                                        />
                                                        {/* Amount label */}
                                                        <span className="accumulation-amount">
                                                            {item.amount >= 1000 ? `${(item.amount / 1000).toFixed(1)}k` : formatMoney(item.amount)}
                                                        </span>
                                                    </div>
                                                    {/* Cumulative total label */}
                                                    <div className="accumulation-cumulative">
                                                        Σ {item.cumulative >= 1000 ? `${(item.cumulative / 1000).toFixed(1)}k` : formatMoney(item.cumulative)}
                                                    </div>
                                                    {/* Date label */}
                                                    <span className="accumulation-date">{item.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {/* Legend */}
                                    <div className="accumulation-legend">
                                        <span className="legend-item">
                                            <span className={`legend-dot ${appMode === 'payments' ? 'legend-dot--payment' : ''}`}></span>
                                            Individual {appMode === 'collections' ? 'Collection' : 'Payment'}
                                        </span>
                                        <span className="legend-item">
                                            <span className="legend-dot legend-dot--cumulative"></span>
                                            Cumulative Total
                                        </span>
                                    </div>
                                </div>
                            </section>
                        );
                    })()}

                    {/* Debt History Timeline */}
                    {selectedPerson.transactions.length > 0 && selectedPerson.totalOwed >= 0 && (
                        <section className="debt-history-section">
                            <div className="section-header-row">
                                <h3 className="section-label">
                                    {appMode === 'collections' ? 'Collection History' : 'Payment History'}
                                </h3>
                                <button
                                    className="sort-toggle-btn"
                                    onClick={() => setHistorySortOrder(prev => prev === 'oldest' ? 'newest' : 'oldest')}
                                    title={historySortOrder === 'oldest' ? 'Showing oldest first' : 'Showing newest first'}
                                >
                                    {historySortOrder === 'oldest' ? '↑ Oldest' : '↓ Newest'}
                                </button>
                            </div>
                            <p className="section-hint">
                                Track how {appMode === 'collections' ? 'collections' : 'payments'} have changed the balance over time
                            </p>
                            <div className="debt-timeline">
                                {(() => {
                                    // Always sort chronologically (oldest first) for running total calculation
                                    const chronoSortedTxs = [...selectedPerson.transactions]
                                        .sort((a, b) => {
                                            const timeA = a.tx.parsedData.dateTime.getTime();
                                            const timeB = b.tx.parsedData.dateTime.getTime();
                                            const amountA = a.entry?.amountPaid || a.tx.parsedData.amount;
                                            const amountB = b.entry?.amountPaid || b.tx.parsedData.amount;
                                            return timeA !== timeB ? timeA - timeB : amountA - amountB;
                                        });

                                    // Calculate running totals (accumulated amounts over time)
                                    let runningTotalPaid = 0;
                                    let runningTotalOwed = 0;
                                    const historyItems: {
                                        tx: typeof chronoSortedTxs[0];
                                        amountPaid: number;
                                        amountOwed: number;
                                        expectedAmount: number;
                                        isComplete: boolean;
                                        cumulativePaid: number;
                                        cumulativeOwed: number;
                                    }[] = [];

                                    chronoSortedTxs.forEach(item => {
                                        const amountPaid = item.entry?.amountPaid || item.tx.parsedData.amount;
                                        const amountOwed = item.entry?.amountOwed || 0;
                                        const expectedAmount = amountPaid + amountOwed;

                                        runningTotalPaid += amountPaid;
                                        runningTotalOwed += amountOwed;

                                        historyItems.push({
                                            tx: item,
                                            amountPaid,
                                            amountOwed,
                                            expectedAmount,
                                            isComplete: amountOwed === 0,
                                            cumulativePaid: runningTotalPaid,
                                            cumulativeOwed: runningTotalOwed
                                        });
                                    });

                                    // Apply display sort order
                                    const displayItems = historySortOrder === 'oldest'
                                        ? historyItems.slice(0, 5)
                                        : [...historyItems].reverse().slice(0, 5);

                                    // Get grand totals for summary
                                    const grandTotalPaid = runningTotalPaid;
                                    const grandTotalOwed = runningTotalOwed;

                                    return (
                                        <>
                                            {/* Running Total Summary */}
                                            <div className="debt-running-total">
                                                <div className="running-total-card">
                                                    <span className="running-total-label">
                                                        {appMode === 'collections' ? 'Total Collected' : 'Total Paid'}
                                                    </span>
                                                    <span className="running-total-value running-total-value--paid">
                                                        Ksh {formatMoney(grandTotalPaid)}
                                                    </span>
                                                </div>
                                                <div className="running-total-card">
                                                    <span className="running-total-label">
                                                        {appMode === 'collections' ? 'Total Still Owed' : 'Total Still To Pay'}
                                                    </span>
                                                    <span className="running-total-value running-total-value--owed">
                                                        Ksh {formatMoney(grandTotalOwed)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Timeline Items */}
                                            {displayItems.map(({ tx: item, amountPaid, amountOwed, expectedAmount, isComplete }, idx) => {
                                                const dateStr = new Intl.DateTimeFormat('en-KE', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                }).format(item.tx.parsedData.dateTime);

                                                return (
                                                    <div key={item.tx.id} className="debt-timeline-item">
                                                        <div className="debt-timeline-marker">
                                                            <div className={`debt-marker ${isComplete ? 'debt-marker--complete' : ''}`} />
                                                            {idx < displayItems.length - 1 && <div className="debt-timeline-line" />}
                                                        </div>
                                                        <div className="debt-timeline-content">
                                                            <span className="debt-date">{dateStr}</span>
                                                            <div className="debt-expected">
                                                                {appMode === 'collections' ? 'Expected' : 'Owed'}: Ksh {formatMoney(expectedAmount)}
                                                            </div>
                                                            <div className="debt-details">
                                                                <span className={`debt-amount ${appMode === 'payments' ? 'debt-amount--payment' : ''}`}>
                                                                    {appMode === 'collections' ? '+' : '-'}Ksh {formatMoney(amountPaid)} {appMode === 'collections' ? 'received' : 'paid'}
                                                                </span>
                                                                <span className="debt-arrow">→</span>
                                                                <span className="debt-balance">
                                                                    {isComplete ? (
                                                                        <span className="debt-cleared">✓ Complete</span>
                                                                    ) : (
                                                                        <span className="debt-remaining">Ksh {formatMoney(amountOwed)} {appMode === 'collections' ? 'still owed' : 'still to pay'}</span>
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    );
                                })()}
                            </div>
                        </section>
                    )}

                    {/* Transaction History */}
                    <section className="person-transactions">
                        <div className="section-header-row">
                            <h3 className="section-label">
                                {selectedPerson.transactions.length} {appMode === 'collections' ? 'Collection' : 'Transaction'}{selectedPerson.transactions.length !== 1 ? 's' : ''}
                            </h3>
                            <button
                                className="sort-toggle-btn"
                                onClick={() => setHistorySortOrder(prev => prev === 'oldest' ? 'newest' : 'oldest')}
                                title={historySortOrder === 'oldest' ? 'Showing oldest first' : 'Showing newest first'}
                            >
                                {historySortOrder === 'oldest' ? '↑ Oldest' : '↓ Newest'}
                            </button>
                        </div>
                        <ul className="transaction-list">
                            {selectedPerson.transactions
                                .slice() // Create copy to avoid mutating
                                .sort((a, b) => {
                                    const timeA = a.tx.parsedData.dateTime.getTime();
                                    const timeB = b.tx.parsedData.dateTime.getTime();
                                    const amountA = a.entry?.amountPaid || a.tx.parsedData.amount;
                                    const amountB = b.entry?.amountPaid || b.tx.parsedData.amount;

                                    if (historySortOrder === 'oldest') {
                                        return timeA !== timeB ? timeA - timeB : amountA - amountB;
                                    } else {
                                        return timeB !== timeA ? timeB - timeA : amountB - amountA;
                                    }
                                })
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
                                                <div className="tx-meta">
                                                    <code className="tx-code">{tx.parsedData.transactionCode}</code>
                                                    {tx.category && tx.category !== 'general' && (
                                                        <span className="tx-category" title={getCategoryById(tx.category)?.label}>
                                                            {getCategoryById(tx.category)?.icon}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="tx-amount-wrapper">
                                                <span className={`tx-amount ${isIn ? 'money-in' : 'money-out'}`}>
                                                    {isIn ? '+' : '-'}Ksh {formatMoney(amount)}
                                                </span>
                                                {entry && entry.amountOwed > 0 && (
                                                    <span className="tx-owed">{isIn ? 'Owes' : 'You Owe'}: {formatMoney(entry.amountOwed)}</span>
                                                )}
                                                {tx.parsedData.transactionCost && tx.parsedData.transactionCost > 0 && (
                                                    <span className="tx-fee">Fee: Ksh {formatMoney(tx.parsedData.transactionCost)}</span>
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
                                            <span className="tx-modal-label">{appMode === 'payments' ? 'Total Owed' : 'Expected Amount'}</span>
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
                                                <label>{appMode === 'payments' ? 'Total Owed (Ksh)' : 'Expected Amount (Ksh)'}</label>
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
            <div className="mode-selector mode-selector--three">
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
                <button
                    className={`mode-btn ${appMode === 'overview' ? 'mode-btn--active mode-btn--overview' : ''}`}
                    onClick={() => handleModeChange('overview')}
                >
                    <LayoutGrid size={18} />
                    <span>Overview</span>
                </button>
            </div>

            {/* Net Balance Hero */}
            {!isLoading && (
                <section className={`net-balance-hero ${appMode === 'payments' ? 'net-balance-hero--payments' : ''} ${appMode === 'overview' ? 'net-balance-hero--overview' : ''}`}>
                    {appMode === 'overview' ? (
                        <>
                            <span className="hero-label">Net Position</span>
                            <span className={`hero-amount ${overviewNetBalance >= 0 ? 'hero-amount--positive' : 'hero-amount--negative'}`}>
                                {overviewNetBalance >= 0 ? '+' : '-'}Ksh {formatMoney(Math.abs(animatedOverviewNet))}
                            </span>
                            <span className="hero-context">
                                {overviewNetBalance >= 0 ? 'You are ahead' : 'You are behind'}
                            </span>
                        </>
                    ) : appMode === 'collections' ? (
                        // Collections mode: Show debt owed
                        netBalance > 0 ? (
                            <>
                                <span className="hero-label">You're owed</span>
                                <span className="hero-amount hero-amount--owed">
                                    Ksh {formatMoney(animatedNetBalance)}
                                </span>
                                {peopleWhoOwe > 0 && (
                                    <span className="hero-context">
                                        from {peopleWhoOwe} {peopleWhoOwe === 1 ? 'person' : 'people'}
                                    </span>
                                )}
                            </>
                        ) : (
                            <>
                                <span className="hero-label">All paid up</span>
                                <span className="hero-amount hero-amount--clear">✓</span>
                                <span className="hero-context">No outstanding debts</span>
                            </>
                        )
                    ) : (
                        // Payments mode: Show total paid out
                        totalIn > 0 ? (
                            <>
                                <span className="hero-label">You paid</span>
                                <span className="hero-amount hero-amount--paid">
                                    Ksh {formatMoney(animatedTotalIn)}
                                </span>
                                {peopleWhoOwe > 0 && (
                                    <span className="hero-context">
                                        to {peopleWhoOwe} {peopleWhoOwe === 1 ? 'person' : 'people'}
                                    </span>
                                )}
                            </>
                        ) : (
                            <>
                                <span className="hero-label">All settled</span>
                                <span className="hero-amount hero-amount--clear">✓</span>
                                <span className="hero-context">No payments recorded</span>
                            </>
                        )
                    )}
                </section>
            )}

            {/* Summary Cards - CountPesa Style */}
            <section className="summary-section">
                <div className={`summary-cards ${appMode === 'overview' ? 'summary-cards--four' : ''}`}>
                    {appMode === 'overview' ? (
                        <>
                            {/* Overview Mode - 4 Cards */}
                            <div className="summary-card summary-card--in">
                                <div className="summary-card-header">
                                    <ArrowDownLeft size={20} />
                                    <span>Received</span>
                                </div>
                                <div className="summary-card-amount">
                                    <span className="currency">Ksh</span>
                                    <span className="money money-lg money-in">{formatMoney(animatedCollectionsReceived)}</span>
                                </div>
                            </div>
                            <div className="summary-card summary-card--paid">
                                <div className="summary-card-header">
                                    <ArrowUpRight size={20} />
                                    <span>Paid Out</span>
                                </div>
                                <div className="summary-card-amount">
                                    <span className="currency">Ksh</span>
                                    <span className="money money-lg money-in">{formatMoney(animatedPaymentsPaid)}</span>
                                </div>
                            </div>
                            <div className="summary-card summary-card--out">
                                <div className="summary-card-header">
                                    <ArrowDownLeft size={20} />
                                    <span>They Owe You</span>
                                </div>
                                <div className="summary-card-amount">
                                    <span className="currency">Ksh</span>
                                    <span className="money money-lg money-out">{formatMoney(animatedCollectionsOwed)}</span>
                                </div>
                            </div>
                            <div className="summary-card summary-card--owe">
                                <div className="summary-card-header">
                                    <ArrowUpRight size={20} />
                                    <span>You Owe Them</span>
                                </div>
                                <div className="summary-card-amount">
                                    <span className="currency">Ksh</span>
                                    <span className="money money-lg money-debt">{formatMoney(animatedPaymentsOwed)}</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Collections/Payments Mode - 2 Cards */}
                            <div className={`summary-card ${appMode === 'collections' ? 'summary-card--in' : 'summary-card--paid'}`}>
                                <div className="summary-card-header">
                                    {appMode === 'collections' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                                    <span>{appMode === 'collections' ? 'Received' : 'Paid Out'}</span>
                                </div>
                                <div className="summary-card-amount">
                                    <span className="currency">Ksh</span>
                                    <span className={`money money-lg ${appMode === 'collections' ? 'money-in' : 'money-in'}`}>{formatMoney(animatedTotalIn)}</span>
                                </div>
                            </div>

                            <div className={`summary-card ${appMode === 'collections' ? 'summary-card--out' : 'summary-card--owe'}`}>
                                <div className="summary-card-header">
                                    {appMode === 'collections' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                                    <span>{appMode === 'collections' ? 'Still Owed' : 'You Still Owe'}</span>
                                </div>
                                <div className="summary-card-amount">
                                    <span className="currency">Ksh</span>
                                    <span className={`money money-lg ${appMode === 'collections' ? 'money-out' : 'money-debt'}`}>{formatMoney(animatedTotalOut)}</span>
                                </div>
                            </div>
                        </>
                    )}
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
                    <button
                        className={`filter-toggle-btn ${showAdvancedFilters ? 'filter-toggle-btn--active' : ''}`}
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        title="Advanced filters"
                    >
                        <SlidersHorizontal size={18} />
                    </button>
                </div>

                {/* Advanced Filters Panel */}
                {showAdvancedFilters && (
                    <div className="advanced-filters-panel">
                        <div className="filter-group">
                            <label className="filter-label">Amount Range</label>
                            <div className="filter-amount-row">
                                <input
                                    type="number"
                                    placeholder="Min"
                                    value={filterAmountMin}
                                    onChange={e => setFilterAmountMin(e.target.value)}
                                    className="filter-input filter-input--small"
                                />
                                <span className="filter-separator">—</span>
                                <input
                                    type="number"
                                    placeholder="Max"
                                    value={filterAmountMax}
                                    onChange={e => setFilterAmountMax(e.target.value)}
                                    className="filter-input filter-input--small"
                                />
                            </div>
                        </div>
                        <div className="filter-group">
                            <label className="filter-label">Status</label>
                            <div className="filter-chips">
                                {(['all', 'complete', 'partial'] as const).map(status => (
                                    <button
                                        key={status}
                                        className={`filter-chip ${filterStatus === status ? 'filter-chip--active' : ''}`}
                                        onClick={() => setFilterStatus(status)}
                                    >
                                        {status === 'all' ? 'All' : status === 'complete' ? '✓ Complete' : '◐ Partial'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="filter-group">
                            <label className="filter-label">Type</label>
                            <div className="filter-chips">
                                {(['all', 'received', 'sent'] as const).map(type => (
                                    <button
                                        key={type}
                                        className={`filter-chip ${filterType === type ? 'filter-chip--active' : ''}`}
                                        onClick={() => setFilterType(type)}
                                    >
                                        {type === 'all' ? 'All' : type === 'received' ? '↓ Received' : '↑ Sent'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {(filterAmountMin || filterAmountMax || filterStatus !== 'all' || filterType !== 'all') && (
                            <button
                                className="filter-clear-btn"
                                onClick={() => {
                                    setFilterAmountMin('');
                                    setFilterAmountMax('');
                                    setFilterStatus('all');
                                    setFilterType('all');
                                }}
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                )}

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

                {/* Summary Stats Bar */}
                {!isLoading && filteredTransactions.length > 0 && (
                    <div className="summary-stats-bar">
                        <div className="summary-stat">
                            <span className="summary-stat-value">{filteredTransactions.length}</span>
                            <span className="summary-stat-label">Transactions</span>
                        </div>
                        <div className="summary-stat">
                            <span className="summary-stat-value">
                                {formatMoney(
                                    filteredTransactions
                                        .filter(tx => appMode === 'overview'
                                            ? true  // All transactions in overview
                                            : appMode === 'payments'
                                                ? tx.parsedData.type !== 'received'
                                                : tx.parsedData.type === 'received')
                                        .reduce((sum, tx) => {
                                            const entry = ledgerEntries.find(e => e.transactionId === tx.id);
                                            return sum + (entry?.amountPaid || tx.parsedData.amount);
                                        }, 0)
                                )}
                            </span>
                            <span className="summary-stat-label">
                                {appMode === 'overview' ? 'Total Volume' : appMode === 'payments' ? 'Paid Out' : 'Collected'}
                            </span>
                        </div>
                        <div className="summary-stat">
                            <span className="summary-stat-value summary-stat-value--highlight">
                                {formatMoney(
                                    personGroups.reduce((sum, p) => sum + p.totalOwed, 0)
                                )}
                            </span>
                            <span className="summary-stat-label">{appMode === 'payments' ? 'You Owe' : 'Outstanding'}</span>
                        </div>
                        <div className="summary-stat">
                            <span className="summary-stat-value">{personGroups.length}</span>
                            <span className="summary-stat-label">People</span>
                        </div>
                    </div>
                )}
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
                            {appMode === 'collections' ? 'No collections yet' :
                                appMode === 'payments' ? 'No payments yet' :
                                    'No transactions yet'}
                        </h3>
                        <p className="empty-description">
                            {appMode === 'collections'
                                ? 'Import your M-Pesa statement to see who owes you money'
                                : appMode === 'payments'
                                    ? 'Import your M-Pesa statement to track your expenses'
                                    : 'Import your M-Pesa statement to see your complete financial picture'
                            }
                        </p>

                        <div className="empty-actions">
                            <button className="empty-cta empty-cta--primary" onClick={onRecordPayment}>
                                <Plus size={18} strokeWidth={2.5} />
                                Add Transaction
                            </button>
                        </div>

                        <div className="empty-divider">
                            <span>or</span>
                        </div>

                        <div className="empty-import-hint">
                            <div className="import-hint-icon">📄</div>
                            <div className="import-hint-text">
                                <strong>Import M-Pesa Statement</strong>
                                <span>Upload your PDF statement to import all transactions at once</span>
                            </div>
                        </div>

                        {/* Feature Slides */}
                        <div className="empty-features">
                            <div className="feature-slide">
                                <div className="feature-slide-icon">📱</div>
                                <div className="feature-slide-content">
                                    <h4>Paste Message</h4>
                                    <p>Copy any M-Pesa confirmation and paste it here</p>
                                </div>
                            </div>
                            <div className="feature-slide">
                                <div className="feature-slide-icon">📊</div>
                                <div className="feature-slide-content">
                                    <h4>Auto-Categorize</h4>
                                    <p>Transactions are automatically sorted by type</p>
                                </div>
                            </div>
                            <div className="feature-slide">
                                <div className="feature-slide-icon">👥</div>
                                <div className="feature-slide-content">
                                    <h4>Track People</h4>
                                    <p>See who owes you and who you've paid</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : filteredTransactions.length === 0 ? (
                    /* Period-specific empty state - when transactions exist but none match current period/mode */
                    <div className="empty-state empty-state--period">
                        <div className="empty-illustration">
                            <div className="empty-icon-circle empty-icon-circle--muted">
                                <Calendar size={32} strokeWidth={1.5} />
                            </div>
                        </div>
                        <h3 className="empty-title">
                            {appMode === 'collections'
                                ? `No collections ${activePeriod === 'week' ? 'this week' : activePeriod === 'month' ? 'this month' : ''}`
                                : appMode === 'payments'
                                    ? `No payments ${activePeriod === 'week' ? 'this week' : activePeriod === 'month' ? 'this month' : ''}`
                                    : `No transactions ${activePeriod === 'week' ? 'this week' : activePeriod === 'month' ? 'this month' : ''}`
                            }
                        </h3>
                        <p className="empty-description">
                            {appMode === 'collections'
                                ? activePeriod === 'week'
                                    ? "You haven't received any payments this week. Try changing the filter to see older collections."
                                    : activePeriod === 'month'
                                        ? "No collections recorded this month. Check 'All Time' to see your full history."
                                        : "No collections found for this period."
                                : appMode === 'payments'
                                    ? activePeriod === 'week'
                                        ? "No expenses recorded this week. Try 'This Month' or 'All Time' to see more."
                                        : activePeriod === 'month'
                                            ? "No payments made this month. Great for your budget!"
                                            : "No payments found for this period."
                                    : activePeriod === 'week'
                                        ? "No financial activity this week. Try a different time period."
                                        : activePeriod === 'month'
                                            ? "No transactions this month. Check 'All Time' to see your history."
                                            : "No transactions found."
                            }
                        </p>
                        <div className="empty-period-hint">
                            {activePeriod !== 'all' && (
                                <button
                                    className="empty-change-period-btn"
                                    onClick={() => setActivePeriod('all')}
                                >
                                    View All Time
                                </button>
                            )}
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
                            .map((person, idx) => {
                                const isCollection = person.primaryType === 'collection';
                                return (
                                    <div
                                        key={idx}
                                        className={`person-card ${appMode === 'payments' ? 'person-card--payments' : ''} ${appMode === 'overview' ? (isCollection ? 'person-card--collection' : 'person-card--payment') : ''}`}
                                        onClick={() => setSelectedPerson(person)}
                                    >
                                        {/* Type indicator for Overview mode */}
                                        {appMode === 'overview' && (
                                            <div className={`person-type-icon ${isCollection ? 'person-type-icon--in' : 'person-type-icon--out'}`}>
                                                {isCollection ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                            </div>
                                        )}
                                        <div className="person-info">
                                            <span className="person-name">{person.name}</span>
                                            <span className="person-count">
                                                {person.transactions.length} {appMode === 'overview'
                                                    ? (person.totalCollected > 0 && person.totalPaid > 0
                                                        ? 'transaction'
                                                        : (isCollection ? 'collection' : 'payment'))
                                                    : 'payment'}{person.transactions.length !== 1 ? 's' : ''}
                                            </span>
                                            {person.lastTransactionDate && (
                                                <span className="person-last-date">
                                                    Last: {new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short' }).format(person.lastTransactionDate)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="person-totals">
                                            {appMode === 'overview' ? (
                                                // Overview: Show net amount
                                                (() => {
                                                    const netAmount = person.totalCollected - person.totalPaid;
                                                    const isPositive = netAmount >= 0;
                                                    return (
                                                        <span className={`person-received ${isPositive ? '' : 'person-received--payments'}`}>
                                                            {isPositive ? '+' : ''}Ksh {formatMoney(Math.abs(netAmount))}
                                                        </span>
                                                    );
                                                })()
                                            ) : (
                                                <span className={`person-received ${appMode === 'payments' ? 'person-received--payments' : ''}`}>
                                                    {appMode === 'payments' ? '-' : ''}Ksh {formatMoney(person.totalReceived)}
                                                </span>
                                            )}
                                            {person.totalOwed > 0 && (
                                                <span className={`person-owed ${appMode === 'payments' ? 'person-owed--payments' : ''}`}>
                                                    {appMode === 'collections' ? 'Owes' : (appMode === 'payments' ? 'You Owe' : (isCollection ? 'Owes' : 'You Owe'))}: Ksh {formatMoney(person.totalOwed)}
                                                </span>
                                            )}
                                        </div>
                                        <ChevronRight size={18} className="person-chevron" />
                                    </div>
                                )
                            })}
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
                                    <div className="day-label-group">
                                        <span className="day-label">{group.dateLabel}</span>
                                        <span className="day-count">{group.transactions.length} transaction{group.transactions.length !== 1 ? 's' : ''}</span>
                                    </div>
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
                                                        {tx.category && tx.category !== 'general' && (
                                                            <span className="tx-category" title={getCategoryById(tx.category)?.label}>
                                                                {getCategoryById(tx.category)?.icon}
                                                            </span>
                                                        )}
                                                        <span className="tx-time">{formatTime(tx.parsedData.dateTime)}</span>
                                                    </div>
                                                </div>

                                                <div className="tx-amount-wrapper">
                                                    <span className={`tx-amount ${isIn ? 'money-in' : 'money-out'}`}>
                                                        {isIn ? '+' : '-'}Ksh {formatMoney(amount)}
                                                    </span>
                                                    {entry && entry.amountOwed > 0 && (
                                                        <span className="tx-owed">{isIn ? 'Owes' : 'You Owe'}: {formatMoney(entry.amountOwed)}</span>
                                                    )}
                                                    {tx.parsedData.transactionCost && tx.parsedData.transactionCost > 0 && (
                                                        <span className="tx-fee">Fee: Ksh {formatMoney(tx.parsedData.transactionCost)}</span>
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
