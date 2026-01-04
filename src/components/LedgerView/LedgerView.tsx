/**
 * Ledger View Component - Premium Finance Style
 */

import React from 'react';
import type { Transaction, LedgerEntry, Worker } from '../../ledger/types';
import './LedgerView.css';

export interface LedgerViewProps {
    transactions: Transaction[];
    entries: LedgerEntry[];
    workers?: Worker[];
    showWorkerColumn?: boolean;
}

export function LedgerView({
    transactions,
    entries,
    workers = [],
    showWorkerColumn = true
}: LedgerViewProps) {
    const formatAmount = (value: number) => {
        return value.toLocaleString('en-KE', { minimumFractionDigits: 0 });
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-KE', {
            day: 'numeric',
            month: 'short',
        }).format(date);
    };

    // Sort entries by date (newest first)
    const sortedEntries = [...entries].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    const totalPaid = entries.reduce((sum, e) => sum + e.amountPaid, 0);
    const totalOwed = entries.reduce((sum, e) => sum + e.amountOwed, 0);

    if (sortedEntries.length === 0) {
        return (
            <div className="ledger">
                <div className="ledger-empty">
                    <div className="ledger-empty__icon">📒</div>
                    <p className="ledger-empty__text">No transactions yet</p>
                    <p className="ledger-empty__hint">Record your first payment to see it here</p>
                </div>
            </div>
        );
    }

    return (
        <div className="ledger">
            <div className="ledger__header">
                <h2 className="ledger__title">Transaction History</h2>
                <span className="ledger__count">{transactions.length} records</span>
            </div>

            <ul className="ledger-list">
                {sortedEntries.map((entry) => {
                    const tx = transactions.find(t => t.id === entry.transactionId);
                    if (!tx) return null;

                    const hasDebt = entry.amountOwed > 0;
                    const isReceived = tx.parsedData.type === 'received';

                    return (
                        <li key={entry.id} className="ledger-item">
                            <div className={`ledger-item__icon ${isReceived ? 'ledger-item__icon--received' : 'ledger-item__icon--sent'}`}>
                                {isReceived ? '💰' : '📤'}
                            </div>

                            <div className="ledger-item__details">
                                <p className="ledger-item__title">
                                    {tx.parsedData.counterparty.name || tx.parsedData.counterparty.phone || 'Payment'}
                                </p>
                                <div className="ledger-item__meta">
                                    <code className="ledger-item__code">{tx.parsedData.transactionCode}</code>
                                    <span className="ledger-item__date">{formatDate(entry.createdAt)}</span>
                                </div>
                            </div>

                            <div className="ledger-item__amounts">
                                <div className="ledger-item__paid">
                                    +KES {formatAmount(entry.amountPaid)}
                                </div>
                                {hasDebt && (
                                    <div className="ledger-item__owed">
                                        -{formatAmount(entry.amountOwed)} owed
                                    </div>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>

            <div className="ledger-summary">
                <div className="ledger-summary__item">
                    <span className="ledger-summary__label">Total Received</span>
                    <span className="ledger-summary__value ledger-summary__value--received">
                        KES {formatAmount(totalPaid)}
                    </span>
                </div>
                <div className="ledger-summary__item">
                    <span className="ledger-summary__label">Total Owed</span>
                    <span className="ledger-summary__value ledger-summary__value--owed">
                        KES {formatAmount(totalOwed)}
                    </span>
                </div>
            </div>
        </div>
    );
}
