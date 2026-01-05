/**
 * Reports Page - Connected to Storage
 */

import { useState, useEffect } from 'react';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import { getTransactionsByUser, getLedgerEntriesByTransaction } from '../storage';
import type { Transaction, LedgerEntry } from '../ledger/types';
import './Reports.css';

const TEMP_USER_ID = 'local-user';

export function ReportsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('month');

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

    const filteredTransactions = filterDate
        ? transactions.filter(tx => tx.parsedData.dateTime >= filterDate)
        : transactions;

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

    // Monthly trend data (last 6 months)
    const monthlyTrend = (() => {
        const months: { [key: string]: { label: string; total: number } } = {};
        const now = new Date();

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = new Intl.DateTimeFormat('en-KE', { month: 'short' }).format(d);
            months[key] = { label, total: 0 };
        }

        // Sum transactions by month
        transactions.forEach(tx => {
            const date = tx.parsedData.dateTime;
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (months[key]) {
                const entry = ledgerEntries.find(e => e.transactionId === tx.id);
                months[key].total += entry?.amountPaid || tx.parsedData.amount;
            }
        });

        return Object.values(months);
    })();

    const formatMoney = (amount: number) => amount.toLocaleString('en-KE');

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
                    <div className="summary-card">
                        <div className="summary-icon">
                            <TrendingUp size={20} />
                        </div>
                        <div className="summary-data">
                            <span className="summary-value amount-positive">
                                {isLoading ? '...' : `KES ${formatMoney(totalReceived)}`}
                            </span>
                            <span className="summary-label">Total Received</span>
                        </div>
                    </div>

                    <div className="summary-card">
                        <div className="summary-icon summary-icon--red">
                            <TrendingDown size={20} />
                        </div>
                        <div className="summary-data">
                            <span className="summary-value amount-negative">
                                {isLoading ? '...' : `KES ${formatMoney(totalOwed)}`}
                            </span>
                            <span className="summary-label">Still Owed to You</span>
                        </div>
                    </div>
                </div>

                {/* Monthly Trend Chart */}
                <section className="trend-section">
                    <h2 className="section-title">6-Month Trend</h2>
                    <div className="trend-chart">
                        {monthlyTrend.map((m, idx) => {
                            const maxTotal = Math.max(...monthlyTrend.map(x => x.total));
                            const heightPercent = maxTotal > 0 ? (m.total / maxTotal) * 100 : 0;
                            return (
                                <div key={idx} className="trend-bar-container">
                                    <div
                                        className="trend-bar"
                                        style={{ height: `${Math.max(heightPercent, 3)}%` }}
                                    />
                                    <span className="trend-bar-label">{m.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Debt Summary */}
                <div className="stats-card">
                    <div className="stat-row">
                        <span className="stat-label">Payments Recorded</span>
                        <span className="stat-value">{filteredTransactions.length}</span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">Collection Rate</span>
                        <span className="stat-value">
                            {totalReceived + totalOwed > 0
                                ? `${Math.round((totalReceived / (totalReceived + totalOwed)) * 100)}%`
                                : '—'
                            }
                        </span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-label">Outstanding Debt</span>
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
                    <h2 className="section-title">Export Data</h2>

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
        </div>
    );
}
