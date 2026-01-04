/**
 * Statement Import Component
 * 
 * Allows users to import M-Pesa PDF statements
 */

import { useState, useCallback } from 'react';
import { Upload, Filter, Check, X, AlertTriangle, FileText, Users, Search, Calendar } from 'lucide-react';
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
    const [searchText, setSearchText] = useState<string>('');
    const [minAmount, setMinAmount] = useState<string>('');
    const [maxAmount, setMaxAmount] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // Import progress
    const [importProgress, setImportProgress] = useState(0);
    const [importedCount, setImportedCount] = useState(0);

    // Password for encrypted PDFs
    const [needsPassword, setNeedsPassword] = useState(false);
    const [password, setPassword] = useState('');
    const [pendingFile, setPendingFile] = useState<File | null>(null);

    const parseFile = useCallback(async (file: File, pwd?: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const parsed = await parseMpesaStatement(file, pwd);
            setStatement(parsed);

            // Mark all as initially unselected
            const txs = parsed.transactions.map(t => ({ ...t, selected: false }));
            setTransactions(txs);
            setFilteredTransactions(txs);
            setNeedsPassword(false);
            setPendingFile(null);
            setPassword('');
            setStep('review');
        } catch (err: any) {
            console.error('Failed to parse statement:', err);
            if (err.message === 'PASSWORD_REQUIRED') {
                setNeedsPassword(true);
                setPendingFile(file);
                setError('This PDF is password-protected. Please enter your National ID.');
            } else {
                setError('Failed to parse the PDF. Please ensure it is a valid M-Pesa statement.');
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.pdf')) {
            setError('Please upload a PDF file');
            return;
        }

        await parseFile(file);
    }, [parseFile]);

    const handlePasswordSubmit = useCallback(async () => {
        if (!pendingFile || !password) return;
        await parseFile(pendingFile, password);
    }, [pendingFile, password, parseFile]);

    const applyFilters = useCallback(() => {
        let filtered = [...transactions];

        // Text search: matches name/counterparty, details, or receipt number
        if (searchText.trim()) {
            const query = searchText.toLowerCase().trim();
            filtered = filtered.filter(t =>
                t.counterparty.toLowerCase().includes(query) ||
                t.details.toLowerCase().includes(query) ||
                t.receiptNo.toLowerCase().includes(query)
            );
        }

        if (selectedPerson !== 'all') {
            filtered = filterByCounterparty(filtered, selectedPerson);
        }

        if (selectedType !== 'all') {
            filtered = filterByType(filtered, selectedType as StatementTransaction['type']);
        }

        // Amount range filter
        if (minAmount) {
            const min = parseFloat(minAmount);
            if (!isNaN(min)) {
                filtered = filtered.filter(t => t.paidIn >= min);
            }
        }
        if (maxAmount) {
            const max = parseFloat(maxAmount);
            if (!isNaN(max)) {
                filtered = filtered.filter(t => t.paidIn <= max);
            }
        }

        // Date range filter
        if (startDate) {
            const start = new Date(startDate);
            filtered = filtered.filter(t => t.date >= start);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // Include entire end day
            filtered = filtered.filter(t => t.date <= end);
        }

        setFilteredTransactions(filtered);
    }, [transactions, selectedPerson, selectedType, searchText, minAmount, maxAmount, startDate, endDate]);

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

    // Compute date range bounds based on filtered person's transactions
    const dateRangeBounds = (() => {
        // Filter by person first (before other filters) to get their date range
        let personTransactions = transactions;
        if (selectedPerson !== 'all') {
            personTransactions = filterByCounterparty(transactions, selectedPerson);
        }

        if (personTransactions.length === 0) {
            return { minDate: '', maxDate: '' };
        }

        const dates = personTransactions.map(t => t.date.getTime());
        const minTime = Math.min(...dates);
        const maxTime = Math.max(...dates);

        // Format as YYYY-MM-DD for date input
        const formatDateInput = (time: number) => {
            const d = new Date(time);
            return d.toISOString().split('T')[0];
        };

        return {
            minDate: formatDateInput(minTime),
            maxDate: formatDateInput(maxTime),
        };
    })();

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

                    {!needsPassword ? (
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
                    ) : (
                        <div className="password-section">
                            <p className="password-hint">
                                Enter the unlock code provided by Safaricom
                            </p>
                            <input
                                type="password"
                                className="password-input"
                                placeholder="Enter unlock code"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                            />
                            <button
                                className="primary-btn"
                                onClick={handlePasswordSubmit}
                                disabled={!password || isLoading}
                            >
                                {isLoading ? 'Unlocking...' : 'Unlock PDF'}
                            </button>
                            <button
                                className="back-link"
                                onClick={() => {
                                    setNeedsPassword(false);
                                    setPendingFile(null);
                                    setPassword('');
                                    setError(null);
                                }}
                            >
                                Try different file
                            </button>
                        </div>
                    )}

                    {isLoading && !needsPassword && <p className="loading-text">Parsing statement...</p>}
                    {error && <p className="error-text">{error}</p>}

                    {!needsPassword && (
                        <button className="back-link" onClick={onBack}>
                            ← Back to Record Payment
                        </button>
                    )}
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
                        {/* Search Input */}
                        <div className="filter-group filter-group--full">
                            <label className="filter-label">
                                <Search size={16} />
                                Search
                            </label>
                            <input
                                type="text"
                                className="filter-input"
                                placeholder="Search by name, phone, or receipt..."
                                value={searchText}
                                onChange={(e) => {
                                    setSearchText(e.target.value);
                                    setTimeout(applyFilters, 0);
                                }}
                            />
                        </div>

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

                        {/* Amount Range */}
                        <div className="filter-group">
                            <label className="filter-label">
                                Amount Range
                            </label>
                            <div className="filter-range">
                                <input
                                    type="number"
                                    className="filter-input filter-input--small"
                                    placeholder="Min"
                                    value={minAmount}
                                    onChange={(e) => {
                                        setMinAmount(e.target.value);
                                        setTimeout(applyFilters, 0);
                                    }}
                                />
                                <span className="filter-range-separator">-</span>
                                <input
                                    type="number"
                                    className="filter-input filter-input--small"
                                    placeholder="Max"
                                    value={maxAmount}
                                    onChange={(e) => {
                                        setMaxAmount(e.target.value);
                                        setTimeout(applyFilters, 0);
                                    }}
                                />
                            </div>
                        </div>

                        {/* Date Range */}
                        <div className="filter-group">
                            <label className="filter-label">
                                <Calendar size={16} />
                                Date Range
                            </label>
                            <div className="filter-range">
                                <input
                                    type="date"
                                    className="filter-input filter-input--small"
                                    value={startDate}
                                    min={dateRangeBounds.minDate}
                                    max={dateRangeBounds.maxDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        setTimeout(applyFilters, 0);
                                    }}
                                />
                                <span className="filter-range-separator">-</span>
                                <input
                                    type="date"
                                    className="filter-input filter-input--small"
                                    value={endDate}
                                    min={dateRangeBounds.minDate}
                                    max={dateRangeBounds.maxDate}
                                    onChange={(e) => {
                                        setEndDate(e.target.value);
                                        setTimeout(applyFilters, 0);
                                    }}
                                />
                            </div>
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
                            filteredTransactions.map((tx, index) => (
                                <div
                                    key={`${index}-${tx.receiptNo}`}
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
