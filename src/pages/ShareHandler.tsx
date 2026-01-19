/**
 * Share Handler Page
 * Receives shared M-Pesa messages via Web Share Target API
 * Parses the message and redirects to record payment with pre-filled data
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { parseMpesaMessage } from '../parser';
import { MessageSquare, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import './ShareHandler.css';

type ParseStatus = 'parsing' | 'success' | 'error';

export function ShareHandler() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<ParseStatus>('parsing');
    const [message, setMessage] = useState<string>('');
    const [error, setError] = useState<string>('');

    useEffect(() => {
        // Get shared text from URL params
        const sharedText = searchParams.get('text') || searchParams.get('title') || '';

        if (!sharedText) {
            setStatus('error');
            setError('No message received. Please try sharing again.');
            return;
        }

        setMessage(sharedText);

        // Try to parse as M-Pesa message
        const result = parseMpesaMessage(sharedText);

        if (result.success && result.transaction) {
            setStatus('success');
            const tx = result.transaction;

            // DEBUG: Log what was parsed
            console.log('[ShareHandler] Parsed transaction:', {
                type: tx.type,
                amount: tx.amount,
                counterparty: tx.counterparty,
                transactionCode: tx.transactionCode
            });

            // Determine the correct mode based on transaction type
            const inferredMode = tx.type === 'received' ? 'collections' : 'payments';
            console.log('[ShareHandler] Inferred mode:', inferredMode);

            // Store parsed data in sessionStorage for the record page to pick up
            const dataToStore = {
                raw: sharedText,
                parsed: {
                    type: tx.type,
                    name: tx.counterparty?.name || '',
                    amount: tx.amount,
                    phone: tx.counterparty?.phone || '',
                    dateTime: tx.dateTime.toISOString(),
                    transactionCode: tx.transactionCode
                }
            };
            console.log('[ShareHandler] Storing in sessionStorage:', dataToStore);
            sessionStorage.setItem('shared_mpesa_message', JSON.stringify(dataToStore));

            // Redirect to record payment after short delay
            // Pass the inferred mode so the UI shows correct labels
            setTimeout(() => {
                navigate('/app', {
                    replace: true,
                    state: { openRecord: true, fromShare: true, shareMode: inferredMode }
                });
            }, 1500);
        } else {
            setStatus('error');
            setError(result.error || 'Could not parse this message. Make sure it\'s a valid M-Pesa or Airtel Money message.');
        }
    }, [searchParams, navigate]);

    return (
        <div className="share-handler">
            <div className="share-handler__card">
                {status === 'parsing' && (
                    <>
                        <div className="share-handler__icon share-handler__icon--loading">
                            <Loader2 size={40} className="spinning" />
                        </div>
                        <h2>Processing Message...</h2>
                        <p>Parsing your M-Pesa message</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="share-handler__icon share-handler__icon--success">
                            <CheckCircle size={40} />
                        </div>
                        <h2>Message Parsed!</h2>
                        <p>Redirecting to record transaction...</p>
                        <div className="share-handler__message">
                            <MessageSquare size={16} />
                            <span>{message.substring(0, 100)}...</span>
                        </div>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="share-handler__icon share-handler__icon--error">
                            <AlertCircle size={40} />
                        </div>
                        <h2>Couldn't Parse Message</h2>
                        <p>{error}</p>
                        {message && (
                            <div className="share-handler__message share-handler__message--error">
                                <MessageSquare size={16} />
                                <span>{message.substring(0, 100)}...</span>
                            </div>
                        )}
                        <button
                            className="share-handler__btn"
                            onClick={() => navigate('/app', { replace: true })}
                        >
                            Go to App
                        </button>
                        <button
                            className="share-handler__btn share-handler__btn--secondary"
                            onClick={() => {
                                // Store raw message and let user manually edit
                                sessionStorage.setItem('shared_raw_message', message);
                                navigate('/app', {
                                    replace: true,
                                    state: { openRecord: true, rawMessage: true }
                                });
                            }}
                        >
                            Enter Manually
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
