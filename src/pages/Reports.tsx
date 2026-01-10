/**
 * Reports Page - Connected to Storage
 */

import { useState, useEffect } from 'react';
import { Download, ArrowDownLeft, ArrowUpRight, X, Wallet, CreditCard } from 'lucide-react';
import { getTransactionsByUser, getLedgerEntriesByTransaction } from '../storage';
import type { Transaction, LedgerEntry } from '../ledger/types';
import './Reports.css';

const TEMP_USER_ID = 'local-user';

export function ReportsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [appMode, setAppMode] = useState<'collections' | 'payments'>(() => {
        const saved = localStorage.getItem('mdaftari_app_mode');
        return (saved === 'payments') ? 'payments' : 'collections';
    });
    const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('month');
    const [selectedMonth, setSelectedMonth] = useState<{
        label: string;
        total: number;
        count: number;
        people: string[];
    } | null>(null);

    const currentMonth = new Intl.DateTimeFormat('en-KE', { month: 'long', year: 'numeric' }).format(new Date());

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

    // Filter transactions by date range
    const now = new Date();
    const filterDate = (() => {
        if (dateRange === 'week') {
            const weekAgo = new Date(now);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return weekAgo;
        } else if (dateRange === 'month') {
            const monthAgo = new Date(now);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return monthAgo;
        }
        return null; // 'all'
    })();

    // Handle mode change with localStorage sync
    const handleModeChange = (mode: 'collections' | 'payments') => {
        setAppMode(mode);
        localStorage.setItem('mdaftari_app_mode', mode);
    };

    // First filter by date
    const periodFilteredTx = filterDate
        ? transactions.filter(tx => tx.parsedData.dateTime >= filterDate)
        : transactions;

    // Then filter by mode
    const filteredTransactions = periodFilteredTx.filter(tx => {
        if (appMode === 'collections') {
            return tx.parsedData.type === 'received';
        } else {
            return ['sent', 'paybill', 'buyGoods'].includes(tx.parsedData.type);
        }
    });

    const filteredTxIds = new Set(filteredTransactions.map(tx => tx.id));
    const filteredEntries = ledgerEntries.filter(e => filteredTxIds.has(e.transactionId));

    // Calculate totals from filtered data
    const totalReceived = filteredEntries.reduce((sum, e) => sum + e.amountPaid, 0);
    const totalOwed = filteredEntries.reduce((sum, e) => sum + e.amountOwed, 0);

    // Per-person breakdown
    const personBreakdown = (() => {
        const people: { [name: string]: { name: string; paid: number; owed: number; count: number } } = {};
        filteredTransactions.forEach(tx => {
            const name = tx.parsedData.counterparty.name || tx.parsedData.counterparty.phone || 'Unknown';
            if (!people[name]) {
                people[name] = { name, paid: 0, owed: 0, count: 0 };
            }
            const entry = filteredEntries.find(e => e.transactionId === tx.id);
            people[name].paid += entry?.amountPaid || tx.parsedData.amount;
            people[name].owed += entry?.amountOwed || 0;
            people[name].count += 1;
        });
        return Object.values(people).sort((a, b) => b.paid - a.paid);
    })();

    const formatMoney = (amount: number) => amount.toLocaleString('en-KE');
    // Monthly trend data with enhanced data for interactivity
    const monthlyTrend = (() => {
        const months: {
            [key: string]: {
                label: string;
                total: number;
                count: number;
                people: Set<string>
            }
        } = {};
        const now = new Date();

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = new Intl.DateTimeFormat('en-KE', { month: 'short' }).format(d);
            months[key] = { label, total: 0, count: 0, people: new Set() };
        }

        // Sum transactions by month
        transactions.forEach(tx => {
            const date = tx.parsedData.dateTime;
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (months[key]) {
                const entry = ledgerEntries.find(e => e.transactionId === tx.id);
                months[key].total += entry?.amountPaid || tx.parsedData.amount;
                months[key].count += 1;
                months[key].people.add(tx.parsedData.counterparty.name || tx.parsedData.counterparty.phone || 'Unknown');
            }
        });

        return Object.values(months).map(m => ({
            label: m.label,
            total: m.total,
            count: m.count,
            people: Array.from(m.people),
        }));
    })();

    const handleExportCSV = () => {
        // Generate proper CSV
        const header = 'Date,Name,Phone,Type,Amount,Paid,Owed,Transaction Code\n';
        const rows = transactions.map(tx => {
            const entry = ledgerEntries.find(e => e.transactionId === tx.id);
            const date = tx.parsedData.dateTime.toISOString().split('T')[0];
            const name = (tx.parsedData.counterparty.name || '').replace(/,/g, ' ');
            const phone = tx.parsedData.counterparty.phone || '';
            const type = tx.parsedData.type;
            const amount = tx.parsedData.amount;
            const paid = entry?.amountPaid || amount;
            const owed = entry?.amountOwed || 0;
            const code = tx.parsedData.transactionCode;
            return `${date},"${name}",${phone},${type},${amount},${paid},${owed},${code}`;
        }).join('\n');

        const csv = header + rows;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mdaftari-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportPDF = () => {
        // Generate printable HTML
        const currentDate = new Date().toLocaleDateString('en-KE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Mdaftari Statement - ${currentDate}</title>
    <style>
        body { 
            font-family: system-ui, -apple-system, sans-serif; 
            padding: 40px; 
            max-width: 800px; 
            margin: 0 auto;
            color: #000;
        }
        h1 { font-size: 24px; margin-bottom: 8px; }
        .subtitle { color: #666; margin-bottom: 32px; }
        .summary { 
            display: flex; 
            gap: 24px; 
            margin-bottom: 32px;
        }
        .summary-card {
            flex: 1;
            border: 2px solid #000;
            padding: 16px;
        }
        .summary-label { 
            font-size: 12px; 
            text-transform: uppercase; 
            font-weight: bold;
            margin-bottom: 8px;
        }
        .summary-value { font-size: 24px; font-weight: bold; }
        .received { color: #0B6E4F; }
        .owed { color: #B91C1C; }
        .stats {
            border: 2px solid #000;
            margin-bottom: 32px;
        }
        .stat-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 16px;
            border-bottom: 1px solid #000;
        }
        .stat-row:last-child { border-bottom: none; }
        .footer {
            margin-top: 48px;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
        @media print {
            body { padding: 20px; }
        }
    </style>
</head>
<body>
    <h1>Mdaftari Statement</h1>
    <p class="subtitle">Generated on ${currentDate}</p>
    
    <div class="summary">
        <div class="summary-card">
            <div class="summary-label">Total Received</div>
            <div class="summary-value received">KES ${formatMoney(totalReceived)}</div>
        </div>
        <div class="summary-card">
            <div class="summary-label">Still Owed to You</div>
            <div class="summary-value owed">KES ${formatMoney(totalOwed)}</div>
        </div>
    </div>
    
    <div class="stats">
        <div class="stat-row">
            <span>Payments Recorded</span>
            <strong>${transactions.length}</strong>
        </div>
        <div class="stat-row">
            <span>Collection Rate</span>
            <strong>${totalReceived + totalOwed > 0
                ? Math.round((totalReceived / (totalReceived + totalOwed)) * 100) + '%'
                : '—'
            }</strong>
        </div>
        <div class="stat-row">
            <span>Outstanding Debt</span>
            <strong class="owed">${totalOwed > 0 ? 'KES ' + formatMoney(totalOwed) : 'None'}</strong>
        </div>
    </div>
    
    <div class="footer">
        <p><strong>Mdaftari</strong> - Track Every Shilling</p>
        <p>Data stored locally on your device</p>
    </div>
    
    <script>window.print();</script>
</body>
</html>
        `;

        // Open in new window for printing
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
        }
    };

    return (
        <div className="reports">
            <header className="reports-header">
                <h1 className="reports-title">Reports</h1>
                <p className="reports-subtitle">{currentMonth}</p>
            </header>

            <div className="reports-content">
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

                {/* Date Range Filter */}
                <div className="date-filter">
                    {(['week', 'month', 'all'] as const).map((range) => (
                        <button
                            key={range}
                            className={`filter-btn ${dateRange === range ? 'filter-btn--active' : ''}`}
                            onClick={() => setDateRange(range)}
                        >
                            {range === 'week' ? 'This Week' : range === 'month' ? 'This Month' : 'All Time'}
                        </button>
                    ))}
                </div>

                {/* Summary Cards - Connected to real data */}
                <div className="summary-grid">
                    <div className={`summary-card ${appMode === 'payments' ? 'summary-card--payments' : ''}`}>
                        <div className={`summary-icon ${appMode === 'payments' ? 'summary-icon--red' : ''}`}>
                            {appMode === 'collections' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                        </div>
                        <div className="summary-data">
                            <span className={`summary-value ${appMode === 'collections' ? 'amount-positive' : 'amount-negative'}`}>
                                {isLoading ? '...' : `KES ${formatMoney(totalReceived)}`}
                            </span>
                            <span className="summary-label">
                                {appMode === 'collections' ? 'Total Received' : 'Total Paid Out'}
                            </span>
                        </div>
                    </div>

                    <div className="summary-card">
                        <div className="summary-icon summary-icon--red">
                            {appMode === 'collections' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                        </div>
                        <div className="summary-data">
                            <span className="summary-value amount-negative">
                                {isLoading ? '...' : `KES ${formatMoney(totalOwed)}`}
                            </span>
                            <span className="summary-label">
                                {appMode === 'collections' ? 'Still Owed to You' : 'You Still Owe'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Monthly Trend Chart - Line Chart */}
                <section className="trend-section">
                    <h2 className="section-title">6-Month Trend</h2>
                    <p className="section-subtitle">Tap a point for details</p>

                    <div className="line-chart-container">
                        <svg viewBox="0 0 300 140" className="line-chart" preserveAspectRatio="xMidYMid meet">
                            {/* Grid lines */}
                            <line x1="40" y1="10" x2="40" y2="105" stroke="#e5e5e5" strokeWidth="1" />
                            <line x1="40" y1="105" x2="290" y2="105" stroke="#e5e5e5" strokeWidth="1" />
                            {[0, 25, 50, 75, 100].map((pct, i) => (
                                <line key={i} x1="40" y1={105 - pct * 0.95} x2="290" y2={105 - pct * 0.95} stroke="#f0f0f0" strokeWidth="1" />
                            ))}

                            {/* Line path */}
                            {(() => {
                                const maxTotal = Math.max(...monthlyTrend.map(x => x.total), 1);
                                const points = monthlyTrend.map((m, idx) => {
                                    const x = 60 + idx * 40;
                                    const y = 105 - (m.total / maxTotal) * 90;
                                    return { x, y, data: m };
                                });
                                const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                                return (
                                    <>
                                        {/* Area fill */}
                                        <path
                                            d={`${pathD} L ${points[points.length - 1]?.x || 0} 105 L ${points[0]?.x || 0} 105 Z`}
                                            fill="url(#lineGradient)"
                                            opacity="0.3"
                                        />
                                        {/* Line */}
                                        <path d={pathD} fill="none" stroke="#0b6e4f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        {/* Data points */}
                                        {points.map((p, idx) => (
                                            <g key={idx} onClick={() => p.data.total > 0 && setSelectedMonth(p.data)} style={{ cursor: p.data.total > 0 ? 'pointer' : 'default' }}>
                                                <circle cx={p.x} cy={p.y} r="6" fill="white" stroke="#0b6e4f" strokeWidth="2" />
                                                {p.data.total > 0 && (
                                                    <circle cx={p.x} cy={p.y} r="3" fill="#0b6e4f" />
                                                )}
                                            </g>
                                        ))}
                                    </>
                                );
                            })()}

                            {/* Gradient definition */}
                            <defs>
                                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#0b6e4f" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="#0b6e4f" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* X-axis labels */}
                        <div className="line-chart-labels">
                            {monthlyTrend.map((m, idx) => (
                                <span key={idx} className="line-chart-label">{m.label}</span>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Debt Summary */}
                <div className="stats-card">
                    <div className="stat-row">
                        <span className="stat-label">Payments Recorded</span>
                        <span className="stat-value">{filteredTransactions.length}</span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">{appMode === 'collections' ? 'Collection Rate' : 'Completion Rate'}</span>
                        <span className="stat-value">
                            {totalReceived + totalOwed > 0
                                ? `${Math.round((totalReceived / (totalReceived + totalOwed)) * 100)}%`
                                : '—'
                            }
                        </span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">{appMode === 'collections' ? 'Outstanding Debt' : 'Outstanding Balance'}</span>
                        <span className={`stat-value ${totalOwed > 0 ? 'amount-negative' : 'amount-positive'}`}>
                            {totalOwed > 0 ? `KES ${formatMoney(totalOwed)}` : 'None'}
                        </span>
                    </div>
                </div>

                {/* Per-Person Breakdown */}
                {personBreakdown.length > 0 && (
                    <section className="person-breakdown-section">
                        <h2 className="section-title">Per-Person Breakdown</h2>
                        <div className="person-table">
                            <div className="person-table-header">
                                <span>Name</span>
                                <span>Payments</span>
                                <span>Paid</span>
                                <span>Owed</span>
                            </div>
                            {personBreakdown.map((p, idx) => (
                                <div key={idx} className="person-table-row">
                                    <span className="person-table-name">{p.name}</span>
                                    <span className="person-table-count">{p.count}</span>
                                    <span className="person-table-paid">KES {formatMoney(p.paid)}</span>
                                    <span className={`person-table-owed ${p.owed > 0 ? 'amount-negative' : ''}`}>
                                        {p.owed > 0 ? `KES ${formatMoney(p.owed)}` : '—'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Export Section */}
                <section className="export-section">
                    <h2 className="section-title">Export & Share</h2>

                    <div className="export-options">
                        <button className="export-btn" onClick={handleExportPDF}>
                            <Download size={18} />
                            <div className="export-btn-text">
                                <span className="export-btn-title">Download PDF</span>
                                <span className="export-btn-desc">Monthly statement</span>
                            </div>
                        </button>

                        <button className="export-btn" onClick={handleExportCSV}>
                            <Download size={18} />
                            <div className="export-btn-text">
                                <span className="export-btn-title">Download CSV</span>
                                <span className="export-btn-desc">Spreadsheet format</span>
                            </div>
                        </button>
                    </div>
                </section>
            </div>

            {/* Month Detail Modal */}
            {selectedMonth && (
                <div className="modal-overlay" onClick={() => setSelectedMonth(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setSelectedMonth(null)}>
                            <X size={20} />
                        </button>
                        <h3 className="modal-title">{selectedMonth.label} Details</h3>
                        <div className="modal-stat">
                            <span className="modal-stat-label">Total Collected</span>
                            <span className="modal-stat-value amount-positive">
                                KES {formatMoney(selectedMonth.total)}
                            </span>
                        </div>
                        <div className="modal-stat">
                            <span className="modal-stat-label">Transactions</span>
                            <span className="modal-stat-value">{selectedMonth.count}</span>
                        </div>
                        {selectedMonth.people.length > 0 && (
                            <div className="modal-people">
                                <span className="modal-stat-label">
                                    👥 People ({selectedMonth.people.length})
                                </span>
                                <ul className="modal-people-list">
                                    {selectedMonth.people.slice(0, 5).map((name, idx) => (
                                        <li key={idx}>{name}</li>
                                    ))}
                                    {selectedMonth.people.length > 5 && (
                                        <li className="modal-people-more">
                                            +{selectedMonth.people.length - 5} more
                                        </li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
