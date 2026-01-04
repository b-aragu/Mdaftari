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
        alert('PDF export coming soon!');
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
