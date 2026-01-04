/**
 * Home Page - CountPesa Inspired
 */

import { useState, useEffect } from 'react';
import { Plus, ArrowDownLeft, ArrowUpRight, Calendar, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
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

export function HomePage({ onRecordPayment }: HomePageProps) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activePeriod, setActivePeriod] = useState<'week' | 'month' | 'all'>('week');

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

    // Group transactions by day
    const dayGroups: DayGroup[] = [];
    const sortedTxs = [...transactions].sort((a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime()
    );

    sortedTxs.forEach(tx => {
        const dateKey = tx.createdAt.toDateString();
        let group = dayGroups.find(g => g.date.toDateString() === dateKey);

        if (!group) {
            group = {
                date: tx.createdAt,
                dateLabel: formatDateLabel(tx.createdAt),
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

            {/* Transactions List - Grouped by Day */}
            <section className="transactions-section">
                <div className="section-header">
                    <h2 className="section-title">Transactions</h2>
                    <button className="view-all-btn">
                        <Calendar size={16} />
                        <span>Filter</span>
                    </button>
                </div>

                {isLoading ? (
                    <div className="loading-state">Loading...</div>
                ) : dayGroups.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📊</div>
                        <h3>No transactions yet</h3>
                        <p>Record your first M-Pesa transaction to get started</p>
                    </div>
                ) : (
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
                                                        <span className="tx-time">{formatTime(tx.createdAt)}</span>
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
