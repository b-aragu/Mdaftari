/**
 * Message Input Component
 * 
 * Textarea for pasting M-Pesa messages
 */

import { useState, useCallback } from 'react';
import { parseMessage, type ParseResult } from '../../parser';
import './MessageInput.css';

export interface MessageInputProps {
    onParsed: (result: ParseResult) => void;
}

export function MessageInput({ onParsed }: MessageInputProps) {
    const [message, setMessage] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleParse = useCallback(() => {
        if (!message.trim()) {
            setError('Please enter a message');
            return;
        }

        const result = parseMessage(message);
        if (result.success) {
            setError(null);
            onParsed(result);
        } else {
            setError(result.error || 'Could not parse message');
        }
    }, [message, onParsed]);

    return (
        <div className="message-input">
            <textarea
                className="message-input__textarea"
                placeholder="Paste your M-Pesa message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
            />
            {error && <p className="message-input__error">{error}</p>}
            <button
                className="message-input__button"
                onClick={handleParse}
                disabled={!message.trim()}
            >
                Parse Message
            </button>
        </div>
    );
}
