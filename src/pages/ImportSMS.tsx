/**
 * Import SMS Page
 * 
 * Allows users to browse their SMS inbox, view M-Pesa messages,
 * and import them as transactions.
 */

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Check, AlertCircle, Smartphone, Lock, MessageSquare, Download } from 'lucide-react';
import {
    isSMSAvailable,
    checkSMSPermission,
    requestSMSPermission,
    getMpesaMessages,
    type ParsedSMSMessage
} from '../services/sms-reader';
import { getExistingReceiptNumbers, saveTransaction, createLedgerEntry } from '../storage/operations';
import { detectPartialPayment } from '../ledger';
import './ImportSMS.css';

interface ImportSMSProps {
    onBack: () => void;
    onSuccess: () => void;
}

const TEMP_USER_ID = 'local-user-001';

export function ImportSMS({ onBack, onSuccess }: ImportSMSProps) {
    const [isAvailable, setIsAvailable] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt' | 'checking'>('checking');
    const [messages, setMessages] = useState<ParsedSMSMessage[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [existingCodes, setExistingCodes] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [importedCount, setImportedCount] = useState(0);

    // Check platform availability
    useEffect(() => {
        setIsAvailable(isSMSAvailable());
    }, []);

    // Check permission status on mount
    useEffect(() => {
        async function checkPermission() {
            if (!isAvailable) return;
            const status = await checkSMSPermission();
            setPermissionStatus(status);
        }
        checkPermission();
    }, [isAvailable]);

    // Load messages when permission is granted
    useEffect(() => {
        if (permissionStatus === 'granted') {
            loadMessages();
        }
    }, [permissionStatus]);

    const loadMessages = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Get parsed M-Pesa messages
            const mpesaMessages = await getMpesaMessages(200);

            // Get existing transaction codes to filter duplicates
            const codes = mpesaMessages
                .filter(m => m.parseResult.success && m.parseResult.transaction)
                .map(m => m.parseResult.transaction!.transactionCode);

            const existing = await getExistingReceiptNumbers(codes);
            setExistingCodes(existing);

            // Sort by date (newest first)
            mpesaMessages.sort((a, b) => b.date - a.date);

            setMessages(mpesaMessages);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load messages');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleRequestPermission = async () => {
        const granted = await requestSMSPermission();
        setPermissionStatus(granted ? 'granted' : 'denied');
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const selectAll = () => {
        const newMessages = messages.filter(m =>
            m.parseResult.success &&
            m.parseResult.transaction &&
            !existingCodes.has(m.parseResult.transaction.transactionCode)
        );
        setSelectedIds(new Set(newMessages.map(m => m.id)));
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
    };

    const handleImport = async () => {
        if (selectedIds.size === 0) return;

        setIsImporting(true);
        setError(null);
        let imported = 0;

        try {
            for (const id of selectedIds) {
                const msg = messages.find(m => m.id === id);
                if (!msg?.parseResult.success || !msg.parseResult.transaction) continue;

                const tx = msg.parseResult.transaction;

                try {
                    const savedTx = await saveTransaction(tx, TEMP_USER_ID, tx.amount);
                    const partial = detectPartialPayment(tx.amount, tx.amount);

                    await createLedgerEntry(
                        savedTx.id,
                        null,
                        tx.amount,
                        partial.remainingDebt,
                        tx.amount,
                        partial.remainingDebt
                    );

                    imported++;
                } catch (err) {
                    // Skip duplicates silently
                    if (!(err instanceof Error && err.message.includes('already exists'))) {
                        console.error('Error importing:', err);
                    }
                }
            }

            setImportedCount(imported);

            if (imported > 0) {
                // Refresh to update which are already imported
                await loadMessages();
                setSelectedIds(new Set());

                // Notify success
                setTimeout(() => {
                    onSuccess();
                }, 1500);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed');
        } finally {
            setIsImporting(false);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Intl.DateTimeFormat('en-KE', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(timestamp));
    };

    const formatAmount = (amount: number) => {
        return amount.toLocaleString('en-KE');
    };

    // Not available on this platform
    if (!isAvailable) {
        return (
            <div className="import-sms">
                <header className="import-sms__header">
                    <button className="back-btn" onClick={onBack}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1>Import from SMS</h1>
                </header>

                <div className="import-sms__unavailable">
                    <div className="unavailable-icon">
                        <Smartphone size={48} />
                    </div>
                    <h2>Not Available</h2>
                    <p>SMS import is only available on Android devices.</p>
                    <p className="secondary">Use the Share feature from your Messages app instead.</p>
                </div>
            </div>
        );
    }

    // Permission not granted
    if (permissionStatus !== 'granted') {
        return (
            <div className="import-sms">
                <header className="import-sms__header">
                    <button className="back-btn" onClick={onBack}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1>Import from SMS</h1>
                </header>

                <div className="import-sms__permission">
                    <div className="permission-icon">
                        <Lock size={48} />
                    </div>
                    <h2>Permission Required</h2>
                    <p>
                        Mdaftari needs permission to read your SMS messages
                        to automatically detect M-Pesa transactions.
                    </p>

                    <div className="permission-benefits">
                        <div className="benefit">
                            <MessageSquare size={20} />
                            <span>Read M-Pesa confirmation messages</span>
                        </div>
                        <div className="benefit">
                            <Download size={20} />
                            <span>Import transactions automatically</span>
                        </div>
                    </div>

                    <p className="privacy-note">
                        🔒 Your messages stay on your device. We only read M-Pesa messages.
                    </p>

                    {permissionStatus === 'checking' ? (
                        <div className="loading-spinner" />
                    ) : permissionStatus === 'denied' ? (
                        <div className="permission-denied">
                            <AlertCircle size={20} />
                            <p>Permission denied. Please enable in Settings.</p>
                        </div>
                    ) : (
                        <button className="permission-btn" onClick={handleRequestPermission}>
                            Allow SMS Access
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Main content - permission granted
    const newMessages = messages.filter(m =>
        m.parseResult.success &&
        m.parseResult.transaction &&
        !existingCodes.has(m.parseResult.transaction.transactionCode)
    );

    const existingMessages = messages.filter(m =>
        m.parseResult.success &&
        m.parseResult.transaction &&
        existingCodes.has(m.parseResult.transaction.transactionCode)
    );

    return (
        <div className="import-sms">
            <header className="import-sms__header">
                <button className="back-btn" onClick={onBack}>
                    <ArrowLeft size={20} />
                </button>
                <h1>Import from SMS</h1>
                <button className="refresh-btn" onClick={loadMessages} disabled={isLoading}>
                    <RefreshCw size={20} className={isLoading ? 'spinning' : ''} />
                </button>
            </header>

            {error && (
                <div className="import-sms__error">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            {importedCount > 0 && (
                <div className="import-sms__success">
                    <Check size={18} />
                    <span>Imported {importedCount} transaction{importedCount !== 1 ? 's' : ''}!</span>
                </div>
            )}

            <div className="import-sms__stats">
                <div className="stat">
                    <span className="stat-value">{messages.length}</span>
                    <span className="stat-label">M-Pesa Messages</span>
                </div>
                <div className="stat stat--new">
                    <span className="stat-value">{newMessages.length}</span>
                    <span className="stat-label">New</span>
                </div>
                <div className="stat stat--existing">
                    <span className="stat-value">{existingMessages.length}</span>
                    <span className="stat-label">Already Imported</span>
                </div>
            </div>

            {newMessages.length > 0 && (
                <div className="import-sms__actions">
                    <button className="select-all-btn" onClick={selectAll}>
                        Select All New ({newMessages.length})
                    </button>
                    {selectedIds.size > 0 && (
                        <button className="clear-btn" onClick={clearSelection}>
                            Clear
                        </button>
                    )}
                </div>
            )}

            <div className="import-sms__list">
                {isLoading ? (
                    <div className="loading-state">
                        <div className="loading-spinner" />
                        <p>Scanning SMS inbox...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="empty-state">
                        <MessageSquare size={32} />
                        <p>No M-Pesa messages found</p>
                    </div>
                ) : (
                    <>
                        {newMessages.length > 0 && (
                            <div className="message-section">
                                <h3 className="section-title">New Messages</h3>
                                {newMessages.map(msg => {
                                    const tx = msg.parseResult.transaction!;
                                    const isSelected = selectedIds.has(msg.id);

                                    return (
                                        <div
                                            key={msg.id}
                                            className={`sms-item ${isSelected ? 'sms-item--selected' : ''}`}
                                            onClick={() => toggleSelect(msg.id)}
                                        >
                                            <div className="sms-item__check">
                                                {isSelected && <Check size={16} />}
                                            </div>
                                            <div className="sms-item__content">
                                                <div className="sms-item__top">
                                                    <span className={`sms-item__type sms-item__type--${tx.type}`}>
                                                        {tx.type === 'received' ? 'Received' : 'Sent'}
                                                    </span>
                                                    <span className="sms-item__date">{formatDate(msg.date)}</span>
                                                </div>
                                                <div className="sms-item__name">
                                                    {tx.counterparty.name || tx.counterparty.phone || 'Unknown'}
                                                </div>
                                                <div className="sms-item__bottom">
                                                    <span className="sms-item__code">{tx.transactionCode}</span>
                                                    <span className={`sms-item__amount sms-item__amount--${tx.type}`}>
                                                        KES {formatAmount(tx.amount)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {existingMessages.length > 0 && (
                            <div className="message-section">
                                <h3 className="section-title section-title--muted">Already Imported</h3>
                                {existingMessages.slice(0, 5).map(msg => {
                                    const tx = msg.parseResult.transaction!;

                                    return (
                                        <div key={msg.id} className="sms-item sms-item--existing">
                                            <div className="sms-item__check sms-item__check--done">
                                                <Check size={16} />
                                            </div>
                                            <div className="sms-item__content">
                                                <div className="sms-item__top">
                                                    <span className="sms-item__type sms-item__type--existing">
                                                        {tx.type === 'received' ? 'Received' : 'Sent'}
                                                    </span>
                                                    <span className="sms-item__date">{formatDate(msg.date)}</span>
                                                </div>
                                                <div className="sms-item__name">
                                                    {tx.counterparty.name || tx.counterparty.phone || 'Unknown'}
                                                </div>
                                                <div className="sms-item__bottom">
                                                    <span className="sms-item__code">{tx.transactionCode}</span>
                                                    <span className="sms-item__amount">
                                                        KES {formatAmount(tx.amount)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {existingMessages.length > 5 && (
                                    <p className="more-count">
                                        +{existingMessages.length - 5} more already imported
                                    </p>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {selectedIds.size > 0 && (
                <div className="import-sms__footer">
                    <button
                        className="import-btn"
                        onClick={handleImport}
                        disabled={isImporting}
                    >
                        {isImporting ? (
                            <>
                                <div className="loading-spinner loading-spinner--small" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <Download size={18} />
                                Import {selectedIds.size} Transaction{selectedIds.size !== 1 ? 's' : ''}
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
