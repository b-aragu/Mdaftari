/**
 * Statement Import Component
 * 
 * Allows users to import M-Pesa PDF statements
 */

import { useState, useCallback } from 'react';
import { Upload, Filter, Check, X, AlertTriangle, FileText, Users } from 'lucide-react';
import {
    parseMpesaStatement,
    getUniqueCounterparties,
    filterByCounterparty,
    filterByType,
    type StatementTransaction,
    type ParsedStatement
} from '../../parser/mpesa-statement';
import { saveTransaction, createLedgerEntry } from '../../storage';
import type { ParsedTransaction } from '../../parser/types';
import './StatementImport.css';

const TEMP_USER_ID = 'local-user';

interface StatementImportProps {
    onComplete: () => void;
    onBack: () => void;
}

type ImportStep = 'upload' | 'review' | 'confirm' | 'success';

export function StatementImport({ onComplete, onBack }: StatementImportProps) {
    const [step, setStep] = useState<ImportStep>('upload');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statement, setStatement] = useState<ParsedStatement | null>(null);
    const [transactions, setTransactions] = useState<StatementTransaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<StatementTransaction[]>([]);

    // Filters
    const [selectedPerson, setSelectedPerson] = useState<string>('all');
    const [selectedType, setSelectedType] = useState<string>('all');

    // Import progress
    const [importProgress, setImportProgress] = useState(0);
    const [importedCount, setImportedCount] = useState(0);

    const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.pdf')) {
            setError('Please upload a PDF file');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const parsed = await parseMpesaStatement(file);
            setStatement(parsed);

            // Mark all as initially unselected
            const txs = parsed.transactions.map(t => ({ ...t, selected: false }));
            setTransactions(txs);
            setFilteredTransactions(txs);
            setStep('review');
        } catch (err) {
            console.error('Failed to parse statement:', err);
            setError('Failed to parse the PDF. Please ensure it is a valid M-Pesa statement.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const applyFilters = useCallback(() => {
        let filtered = [...transactions];

        if (selectedPerson !== 'all') {
            filtered = filterByCounterparty(filtered, selectedPerson);
        }

        if (selectedType !== 'all') {
            filtered = filterByType(filtered, selectedType as StatementTransaction['type']);
        }

        setFilteredTransactions(filtered);
    }, [transactions, selectedPerson, selectedType]);

    const handlePersonChange = (person: string) => {
        setSelectedPerson(person);
        setTimeout(applyFilters, 0);
    };

    const handleTypeChange = (type: string) => {
        setSelectedType(type);
        setTimeout(applyFilters, 0);
    };

    const toggleTransaction = (receiptNo: string) => {
        setFilteredTransactions(prev =>
            prev.map(t =>
                t.receiptNo === receiptNo ? { ...t, selected: !t.selected } : t
            )
        );
    };

    const toggleSelectAll = () => {
        const allSelected = filteredTransactions.every(t => t.selected);
        setFilteredTransactions(prev =>
            prev.map(t => ({ ...t, selected: !allSelected }))
        );
    };

    const updateExpectedAmount = (receiptNo: string, amount: number) => {
        setFilteredTransactions(prev =>
            prev.map(t =>
                t.receiptNo === receiptNo ? { ...t, expectedAmount: amount } : t
            )
        );
    };

    const handleImport = async () => {
        const selected = filteredTransactions.filter(t => t.selected);
        if (selected.length === 0) {
            setError('Please select at least one transaction to import');
            return;
        }

        setStep('confirm');
        setIsLoading(true);
        setImportProgress(0);
        setImportedCount(0);

        try {
            for (let i = 0; i < selected.length; i++) {
                const tx = selected[i];
                if (!tx) continue;

                // Convert to ParsedTransaction format
                const parsedData: ParsedTransaction = {
                    amount: tx.paidIn > 0 ? tx.paidIn : tx.paidOut,
                    transactionCode: tx.receiptNo,
                    currency: 'KES',
                    type: tx.type === 'received' ? 'received' : 'sent',
                    dateTime: tx.date,
                    counterparty: {
                        name: tx.counterparty,
                        phone: '',
                    },
                    balance: tx.balance,
                    rawMessage: tx.details,
                    source: 'mpesa',
                    confidence: 0.8, // Imported from statement
                };

                // Save transaction
                const savedTx = await saveTransaction(
                    parsedData,
                    TEMP_USER_ID,
                    tx.expectedAmount,
                    `Imported from M-Pesa statement`
                );

                // Create ledger entry
                const amountPaid = tx.paidIn;
                const amountOwed = tx.expectedAmount ? tx.expectedAmount - tx.paidIn : 0;

                await createLedgerEntry(
                    savedTx.id,
                    null, // No worker in personal finance mode
                    amountPaid,
                    Math.max(0, amountOwed),
                    amountPaid,
                    Math.max(0, amountOwed)
                );

                setImportProgress(Math.round(((i + 1) / selected.length) * 100));
                setImportedCount(i + 1);
            }

            setStep('success');
        } catch (err: any) {
            console.error('Import failed:', err);
            if (err.message?.includes('already exists')) {
                setError('Some transactions already exist. Duplicate receipts were skipped.');
                setStep('success');
            } else {
                setError(`Import failed: ${err.message}`);
                setStep('review');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const uniquePeople = statement ? getUniqueCounterparties(transactions) : [];
    const selectedCount = filteredTransactions.filter(t => t.selected).length;

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-KE', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }).format(date);
    };

    const formatMoney = (amount: number) => amount.toLocaleString('en-KE');

    return (
        <div className="statement-import">
            {/* Upload Step */}
            {step === 'upload' && (
                <div className="upload-step">
                    <div className="upload-icon">
                        <FileText size={48} />
                    </div>
                    <h2>Import M-Pesa Statement</h2>
                    <p className="upload-desc">
                        Upload your M-Pesa PDF statement to import transactions
                    </p>

                    <label className="upload-btn">
                        <Upload size={20} />
                        <span>Choose PDF File</span>
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileUpload}
                            disabled={isLoading}
                        />
                    </label>

                    {isLoading && <p className="loading-text">Parsing statement...</p>}
                    {error && <p className="error-text">{error}</p>}

                    <button className="back-link" onClick={onBack}>
                        ← Back to Record Payment
                    </button>
                </div>
            )}

            {/* Review Step */}
            {step === 'review' && statement && (
                <div className="review-step">
                    <div className="review-header">
                        <h2>Review Transactions</h2>
                        <p className="statement-info">
                            {statement.customerName} • {statement.phoneNumber}
                        </p>
                    </div>

                    {/* Filters */}
                    <div className="filters">
                        <div className="filter-group">
                            <label className="filter-label">
                                <Users size={16} />
                                Person
                            </label>
                            <select
                                value={selectedPerson}
                                onChange={(e) => handlePersonChange(e.target.value)}
                                className="filter-select"
                            >
                                <option value="all">All People</option>
                                {uniquePeople.map(person => (
                                    <option key={person} value={person}>{person}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label className="filter-label">
                                <Filter size={16} />
                                Type
                            </label>
                            <select
                                value={selectedType}
                                onChange={(e) => handleTypeChange(e.target.value)}
                                className="filter-select"
                            >
                                <option value="all">All Types</option>
                                <option value="received">Received</option>
                                <option value="sent">Sent</option>
                                <option value="paybill">PayBill</option>
                                <option value="buygoods">Buy Goods</option>
                            </select>
                        </div>
                    </div>

                    {/* Select All */}
                    <div className="select-all-row">
                        <button className="select-all-btn" onClick={toggleSelectAll}>
                            {filteredTransactions.every(t => t.selected) ? (
                                <><X size={16} /> Deselect All</>
                            ) : (
                                <><Check size={16} /> Select All</>
                            )}
                        </button>
                        <span className="selected-count">
                            {selectedCount} of {filteredTransactions.length} selected
                        </span>
                    </div>

                    {/* Transaction List */}
                    <div className="transaction-list">
                        {filteredTransactions.length === 0 ? (
                            <div className="empty-state">
                                <p>No transactions found matching filters</p>
                            </div>
                        ) : (
                            filteredTransactions.map(tx => (
                                <div
                                    key={tx.receiptNo}
                                    className={`tx-row ${tx.selected ? 'tx-row--selected' : ''}`}
                                >
                                    <button
                                        className="tx-checkbox"
                                        onClick={() => toggleTransaction(tx.receiptNo)}
                                    >
                                        {tx.selected ? <Check size={18} /> : null}
                                    </button>

                                    <div className="tx-info">
                                        <div className="tx-main">
                                            <span className="tx-counterparty">{tx.counterparty}</span>
                                            <span className={`tx-amount ${tx.paidIn > 0 ? 'amount-positive' : 'amount-negative'}`}>
                                                {tx.paidIn > 0 ? '+' : '-'}KES {formatMoney(tx.paidIn || tx.paidOut)}
                                            </span>
                                        </div>
                                        <div className="tx-secondary">
                                            <span className="tx-code">{tx.receiptNo}</span>
                                            <span className="tx-date">{formatDate(tx.date)}</span>
                                        </div>
                                    </div>

                                    {tx.selected && (
                                        <div className="tx-expected">
                                            <label className="expected-label">Expected:</label>
                                            <input
                                                type="number"
                                                className="expected-input"
                                                placeholder="Amount owed"
                                                value={tx.expectedAmount || ''}
                                                onChange={(e) => updateExpectedAmount(tx.receiptNo, parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {error && <p className="error-text">{error}</p>}

                    {/* Actions */}
                    <div className="review-actions">
                        <button className="secondary-btn" onClick={onBack}>Cancel</button>
                        <button
                            className="primary-btn"
                            onClick={handleImport}
                            disabled={selectedCount === 0}
                        >
                            Import {selectedCount} Transaction{selectedCount !== 1 ? 's' : ''}
                        </button>
                    </div>
                </div>
            )}

            {/* Confirm/Progress Step */}
            {step === 'confirm' && (
                <div className="confirm-step">
                    <h2>Importing...</h2>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${importProgress}%` }}
                        />
                    </div>
                    <p className="progress-text">
                        {importedCount} of {filteredTransactions.filter(t => t.selected).length} imported
                    </p>
                </div>
            )}

            {/* Success Step */}
            {step === 'success' && (
                <div className="success-step">
                    <div className="success-icon">
                        <Check size={48} />
                    </div>
                    <h2>Import Complete!</h2>
                    <p>{importedCount} transactions imported successfully</p>
                    {error && (
                        <div className="warning-box">
                            <AlertTriangle size={18} />
                            <span>{error}</span>
                        </div>
                    )}
                    <button className="primary-btn" onClick={onComplete}>
                        Done
                    </button>
                </div>
            )}
        </div>
    );
}
