/**
 * Reports Page - Connected to Storage
 */

import { useState, useEffect } from 'react';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import { getTransactionsByUser, getLedgerEntriesByTransaction, exportAllData } from '../storage';
import type { Transaction, LedgerEntry } from '../ledger/types';
import './Reports.css';

const TEMP_USER_ID = 'local-user';

export function ReportsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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

    // Calculate totals - same logic as Home page
    const totalReceived = ledgerEntries.reduce((sum, e) => sum + e.amountPaid, 0);
    const totalOwed = ledgerEntries.reduce((sum, e) => sum + e.amountOwed, 0);

    const formatMoney = (amount: number) => amount.toLocaleString('en-KE');

    const handleExportCSV = async () => {
        try {
            const data = await exportAllData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mdaftari-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            alert('Failed to export data');
        }
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

                {/* Debt Summary */}
                <div className="stats-card">
                    <div className="stat-row">
                        <span className="stat-label">Payments Recorded</span>
                        <span className="stat-value">{transactions.length}</span>
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
                                <span className="export-btn-title">Download JSON</span>
                                <span className="export-btn-desc">All transactions</span>
                            </div>
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
