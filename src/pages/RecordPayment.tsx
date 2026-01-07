/**
 * Record Payment Page
 */

import { useState, useCallback } from 'react';
import { ArrowLeft, Clipboard, Edit3, Check, FileText } from 'lucide-react';
import { parseMessage, type ParseResult, type ParsedTransaction } from '../parser';
import { saveTransaction, createLedgerEntry } from '../storage';
import { detectPartialPayment } from '../ledger';
import { StatementImport } from '../components/StatementImport';
import './RecordPayment.css';

const TEMP_USER_ID = 'local-user';

interface RecordPaymentProps {
    onBack: () => void;
    onSuccess: () => void;
    mode: 'collections' | 'payments';
}

type InputMethod = 'paste' | 'manual' | 'import';
type Step = 'input' | 'confirm';

export function RecordPaymentPage({ onBack, onSuccess, mode }: RecordPaymentProps) {
    const [inputMethod, setInputMethod] = useState<InputMethod>('paste');
    const [step, setStep] = useState<Step>('input');

    // Paste mode state
    const [message, setMessage] = useState('');
    const [parseResult, setParseResult] = useState<ParseResult | null>(null);

    // Form state (for both modes)
    const [amount, setAmount] = useState('');
    const [expectedAmount, setExpectedAmount] = useState('');
    const [fromTo, setFromTo] = useState('');
    const [transactionCode, setTransactionCode] = useState('');
    const [notes, setNotes] = useState('');

    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handlePaste = useCallback(async () => {
        try {
            const text = await navigator.clipboard.readText();
            setMessage(text);
            setError(null);
        } catch {
            setError('Could not access clipboard. Please paste manually.');
        }
    }, []);

    const handleParse = useCallback(() => {
        if (!message.trim()) {
            setError('Please paste a payment message');
            return;
        }

        const result = parseMessage(message);

        if (!result.success) {
            setError(result.error || 'Could not parse message');
            return;
        }

        setParseResult(result);
        setAmount(result.transaction!.amount.toString());
        setExpectedAmount(result.transaction!.amount.toString());
        setFromTo(result.transaction!.counterparty.name || result.transaction!.counterparty.phone || '');
        setTransactionCode(result.transaction!.transactionCode);
        setStep('confirm');
        setError(null);
    }, [message]);

    const handleManualContinue = useCallback(() => {
        if (!amount || parseFloat(amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }
        setStep('confirm');
        setError(null);
    }, [amount]);

    const handleConfirm = useCallback(async () => {
        setIsSaving(true);
        setError(null);

        try {
            const parsedAmount = parseFloat(amount);
            const parsedExpected = parseFloat(expectedAmount) || parsedAmount;

            let transaction: ParsedTransaction;

            if (parseResult?.transaction) {
                transaction = {
                    ...parseResult.transaction,
                    amount: parsedAmount,
                    counterparty: {
                        ...parseResult.transaction.counterparty,
                        name: fromTo || parseResult.transaction.counterparty.name,
                    },
                };
            } else {
                // Manual entry - type depends on mode
                transaction = {
                    transactionCode: transactionCode || `MAN${Date.now()}`,
                    amount: parsedAmount,
                    currency: 'KES',
                    type: mode === 'collections' ? 'received' : 'sent',
                    counterparty: { name: fromTo || undefined },
                    dateTime: new Date(),
                    rawMessage: '',
                    source: 'mpesa',
                    confidence: 1,
                };
            }

            const savedTx = await saveTransaction(transaction, TEMP_USER_ID, parsedExpected, notes);
            const partial = detectPartialPayment(parsedAmount, parsedExpected);

            await createLedgerEntry(
                savedTx.id,
                null,
                parsedAmount,
                partial.remainingDebt,
                parsedAmount,
                partial.remainingDebt
            );

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setIsSaving(false);
        }
    }, [amount, expectedAmount, fromTo, transactionCode, notes, parseResult, onSuccess]);

    const partial = step === 'confirm' && amount && expectedAmount
        ? detectPartialPayment(parseFloat(amount), parseFloat(expectedAmount))
        : null;

    return (
        <div className="record-payment">
            {/* Header */}
            <header className="record-header">
                <button className="back-btn" onClick={onBack}>
                    <ArrowLeft size={20} />
                </button>
                <h1 className="record-title">
                    {mode === 'collections' ? 'Record Collection' : 'Record Payment'}
                </h1>
                <div className="header-spacer" />
            </header>

            {step === 'input' && inputMethod !== 'import' && (
                <div className="record-content">
                    {/* Method Toggle */}
                    <div className="method-toggle">
                        <button
                            className={`method-btn ${inputMethod === 'paste' ? 'method-btn--active' : ''}`}
                            onClick={() => setInputMethod('paste')}
                        >
                            <Clipboard size={18} />
                            Paste
                        </button>
                        <button
                            className={`method-btn ${inputMethod === 'manual' ? 'method-btn--active' : ''}`}
                            onClick={() => setInputMethod('manual')}
                        >
                            <Edit3 size={18} />
                            Manual
                        </button>
                        <button
                            className={`method-btn ${inputMethod === 'import' ? 'method-btn--active' : ''}`}
                            onClick={() => setInputMethod('import')}
                        >
                            <FileText size={18} />
                            Import
                        </button>
                    </div>

                    {error && (
                        <div className="error-message">{error}</div>
                    )}

                    {inputMethod === 'paste' ? (
                        <div className="input-section">
                            <div className="field-group">
                                <label className="field-label">M-Pesa / Airtel Money Message</label>
                                <textarea
                                    className="field-textarea"
                                    placeholder="Paste your payment confirmation message here..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={6}
                                />
                                <button className="paste-btn" onClick={handlePaste}>
                                    <Clipboard size={16} />
                                    Paste from clipboard
                                </button>
                            </div>

                            <button
                                className="primary-btn"
                                onClick={handleParse}
                                disabled={!message.trim()}
                            >
                                Parse Message
                            </button>
                        </div>
                    ) : (
                        <div className="input-section">
                            <div className="field-group">
                                <label className="field-label">
                                    {mode === 'collections' ? 'Amount Received (KES)' : 'Amount Paying (KES)'}
                                </label>
                                <input
                                    type="number"
                                    className="field-input"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>

                            <div className="field-group">
                                <label className="field-label">
                                    {mode === 'collections' ? 'Expected Amount (KES)' : 'Total Owed (KES)'}
                                </label>
                                <input
                                    type="number"
                                    className="field-input"
                                    placeholder="Optional - for partial payment tracking"
                                    value={expectedAmount}
                                    onChange={(e) => setExpectedAmount(e.target.value)}
                                />
                            </div>

                            <div className="field-group">
                                <label className="field-label">
                                    {mode === 'collections' ? 'From (who paid you)' : 'To (who you paid)'}
                                </label>
                                <input
                                    type="text"
                                    className="field-input"
                                    placeholder={mode === 'collections' ? 'Name or phone of payer' : 'Name or phone of recipient'}
                                    value={fromTo}
                                    onChange={(e) => setFromTo(e.target.value)}
                                />
                            </div>

                            <div className="field-group">
                                <label className="field-label">Transaction Code</label>
                                <input
                                    type="text"
                                    className="field-input"
                                    placeholder="e.g., DT85TH896"
                                    value={transactionCode}
                                    onChange={(e) => setTransactionCode(e.target.value)}
                                />
                            </div>

                            <button
                                className="primary-btn"
                                onClick={handleManualContinue}
                                disabled={!amount}
                            >
                                Continue
                            </button>
                        </div>
                    )}

                    <p className="privacy-note">
                        Your data is stored locally on your device
                    </p>
                </div>
            )}

            {step === 'confirm' && (
                <div className="record-content">
                    <h2 className="confirm-title">Confirm Details</h2>

                    {error && (
                        <div className="error-message">{error}</div>
                    )}

                    <div className="confirm-card">
                        <div className="confirm-row">
                            <span className="confirm-label">
                                {mode === 'collections' ? 'Amount Received' : 'Amount Paying'}
                            </span>
                            <input
                                type="number"
                                className="confirm-input"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>

                        <div className="confirm-row">
                            <span className="confirm-label">Expected Amount</span>
                            <input
                                type="number"
                                className="confirm-input"
                                value={expectedAmount}
                                onChange={(e) => setExpectedAmount(e.target.value)}
                            />
                        </div>

                        <div className="confirm-row">
                            <span className="confirm-label">
                                {mode === 'collections' ? 'From' : 'To'}
                            </span>
                            <input
                                type="text"
                                className="confirm-input"
                                value={fromTo}
                                onChange={(e) => setFromTo(e.target.value)}
                                placeholder={mode === 'collections' ? 'Who paid you' : 'Who you paid'}
                            />
                        </div>

                        {transactionCode && (
                            <div className="confirm-row">
                                <span className="confirm-label">Transaction Code</span>
                                <code className="confirm-code">{transactionCode}</code>
                            </div>
                        )}

                        <div className="confirm-row">
                            <span className="confirm-label">Notes</span>
                            <input
                                type="text"
                                className="confirm-input"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Optional"
                            />
                        </div>
                    </div>

                    {partial && partial.isPartial && (
                        <div className="partial-alert">
                            <div className="partial-header">Partial Payment</div>
                            <div className="partial-body">
                                <div className="partial-row">
                                    <span>Received</span>
                                    <span className="amount-positive">KES {parseFloat(amount).toLocaleString()}</span>
                                </div>
                                <div className="partial-row">
                                    <span>Outstanding</span>
                                    <span className="amount-negative">KES {partial.remainingDebt.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="confirm-actions">
                        <button
                            className="secondary-btn"
                            onClick={() => setStep('input')}
                        >
                            Back
                        </button>
                        <button
                            className="primary-btn"
                            onClick={handleConfirm}
                            disabled={isSaving || !amount}
                        >
                            {isSaving ? 'Saving...' : 'Confirm'}
                            {!isSaving && <Check size={18} />}
                        </button>
                    </div>
                </div>
            )}

            {/* Import Statement Mode */}
            {inputMethod === 'import' && (
                <StatementImport
                    onComplete={onSuccess}
                    onBack={() => setInputMethod('paste')}
                    mode={mode}
                />
            )}
        </div>
    );
}
