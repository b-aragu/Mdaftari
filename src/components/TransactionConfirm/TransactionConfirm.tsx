/**
 * Transaction Confirmation Component
 * 
 * Shows parsed transaction details for user confirmation and manual adjustment
 */

import React, { useState, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Badge, ReceivedBadge, SentBadge, PartialBadge } from '../ui/Badge';
import { detectPartialPayment } from '../../ledger';
import { CATEGORIES } from '../../constants/categories';
import type { ParsedTransaction, ParseResult } from '../../parser/types';
import './TransactionConfirm.css';

export interface TransactionConfirmProps {
    parseResult: ParseResult;
    onConfirm: (transaction: ParsedTransaction, expectedAmount: number, options?: { category?: string; isRecurring?: boolean }) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export function TransactionConfirm({
    parseResult,
    onConfirm,
    onCancel,
    isLoading = false,
}: TransactionConfirmProps) {
    const transaction = parseResult.transaction!;

    // Editable fields for manual adjustment
    const [amount, setAmount] = useState(transaction.amount.toString());
    const [expectedAmount, setExpectedAmount] = useState(transaction.amount.toString());
    const [counterpartyName, setCounterpartyName] = useState(
        transaction.counterparty.name || ''
    );
    const [category, setCategory] = useState('general');
    const [isRecurring, setIsRecurring] = useState(false);

    const parsedAmount = parseFloat(amount) || 0;
    const parsedExpected = parseFloat(expectedAmount) || 0;

    const partialPayment = detectPartialPayment(parsedAmount, parsedExpected);

    const handleConfirm = useCallback(() => {
        const updatedTransaction: ParsedTransaction = {
            ...transaction,
            amount: parsedAmount,
            counterparty: {
                ...transaction.counterparty,
                name: counterpartyName || transaction.counterparty.name,
            },
        };

        onConfirm(updatedTransaction, parsedExpected, { category, isRecurring });
    }, [transaction, parsedAmount, parsedExpected, counterpartyName, category, isRecurring, onConfirm]);

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-KE', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(date);
    };

    const formatAmount = (value: number) => {
        return value.toLocaleString('en-KE', {
            style: 'currency',
            currency: 'KES',
            minimumFractionDigits: 2,
        });
    };

    const needsReview = parseResult.needsVerification && parseResult.needsVerification.length > 0;

    return (
        <Card variant="outlined" padding="lg">
            <CardHeader
                title="Confirm Transaction"
                subtitle="Review and adjust the parsed details"
                action={
                    <div className="transaction-confirm__badges">
                        {transaction.type === 'received' && <ReceivedBadge />}
                        {transaction.type === 'sent' && <SentBadge />}
                        {partialPayment.isPartial && <PartialBadge />}
                    </div>
                }
            />

            <CardContent>
                <div className="transaction-confirm">
                    {needsReview && (
                        <div className="transaction-confirm__warning" role="alert">
                            ⚠️ Some fields could not be parsed automatically. Please verify.
                        </div>
                    )}

                    {/* Transaction Code (read-only) */}
                    <div className="transaction-confirm__field transaction-confirm__field--readonly">
                        <span className="transaction-confirm__label">Transaction Code</span>
                        <code className="transaction-confirm__code">{transaction.transactionCode}</code>
                    </div>

                    {/* Date/Time (read-only) */}
                    <div className="transaction-confirm__field transaction-confirm__field--readonly">
                        <span className="transaction-confirm__label">Date & Time</span>
                        <span>{formatDate(transaction.dateTime)}</span>
                    </div>

                    {/* Amount (editable) */}
                    <Input
                        label="Amount Received (KES)"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min={0}
                        step={0.01}
                        error={parsedAmount <= 0 ? 'Amount must be greater than 0' : undefined}
                    />

                    {/* Expected Amount (editable) */}
                    <Input
                        label="Expected Total (KES)"
                        type="number"
                        value={expectedAmount}
                        onChange={(e) => setExpectedAmount(e.target.value)}
                        min={0}
                        step={0.01}
                        hint="Enter the total amount expected for this payment"
                    />

                    {/* From/To (editable) */}
                    <Input
                        label={transaction.type === 'received' ? 'From' : 'To'}
                        type="text"
                        value={counterpartyName}
                        onChange={(e) => setCounterpartyName(e.target.value)}
                        placeholder="Name or identifier"
                    />

                    {/* Phone if available */}
                    {transaction.counterparty.phone && (
                        <div className="transaction-confirm__field transaction-confirm__field--readonly">
                            <span className="transaction-confirm__label">Phone</span>
                            <span>{transaction.counterparty.phone}</span>
                        </div>
                    )}

                    {/* Category Selector */}
                    <div className="transaction-confirm__field">
                        <label className="transaction-confirm__label">Category</label>
                        <div className="category-selector">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    className={`category-chip ${category === cat.id ? 'category-chip--active' : ''}`}
                                    style={{ '--category-color': cat.color } as React.CSSProperties}
                                    onClick={() => setCategory(cat.id)}
                                >
                                    <span className="category-chip__icon">{cat.icon}</span>
                                    <span className="category-chip__label">{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recurring Toggle */}
                    <div className="transaction-confirm__field transaction-confirm__recurring">
                        <label className="transaction-confirm__label">
                            <input
                                type="checkbox"
                                checked={isRecurring}
                                onChange={(e) => setIsRecurring(e.target.checked)}
                                className="recurring-checkbox"
                            />
                            <span>This is a recurring payment</span>
                        </label>
                    </div>

                    {/* Partial Payment Info */}
                    {partialPayment.isPartial && (
                        <div className="transaction-confirm__partial">
                            <div className="transaction-confirm__partial-header">
                                ⚠️ Partial Payment Detected
                            </div>
                            <div className="transaction-confirm__partial-details">
                                <div>
                                    <span className="label">Received</span>
                                    <span className="amount amount--positive">{formatAmount(parsedAmount)}</span>
                                </div>
                                <div>
                                    <span className="label">Expected</span>
                                    <span>{formatAmount(parsedExpected)}</span>
                                </div>
                                <div>
                                    <span className="label">Still Owed</span>
                                    <span className="amount amount--owed">{formatAmount(partialPayment.remainingDebt)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Balance if available */}
                    {transaction.balance !== undefined && (
                        <div className="transaction-confirm__field transaction-confirm__field--readonly">
                            <span className="transaction-confirm__label">New Balance</span>
                            <span className="transaction-confirm__balance">{formatAmount(transaction.balance)}</span>
                        </div>
                    )}

                    {/* Confidence Score */}
                    <div className="transaction-confirm__confidence">
                        <Badge variant={transaction.confidence >= 0.7 ? 'success' : 'warning'}>
                            {Math.round(transaction.confidence * 100)}% confidence
                        </Badge>
                    </div>

                    {/* Actions */}
                    <div className="transaction-confirm__actions">
                        <Button
                            variant="ghost"
                            onClick={onCancel}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleConfirm}
                            disabled={parsedAmount <= 0 || isLoading}
                            loading={isLoading}
                        >
                            Confirm & Save
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
