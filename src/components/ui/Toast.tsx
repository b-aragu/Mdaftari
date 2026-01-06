/**
 * Toast Component
 * 
 * Simple notification toast with auto-dismiss
 */

import { useEffect } from 'react';
import { Check, X, AlertCircle, Info } from 'lucide-react';
import './Toast.css';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    variant?: ToastVariant;
    duration?: number;
    onClose: () => void;
}

export function Toast({
    message,
    variant = 'success',
    duration = 3000,
    onClose
}: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const icons = {
        success: <Check size={18} />,
        error: <AlertCircle size={18} />,
        info: <Info size={18} />,
    };

    return (
        <div className={`toast toast--${variant}`} role="alert">
            <span className="toast-icon">{icons[variant]}</span>
            <span className="toast-message">{message}</span>
            <button className="toast-close" onClick={onClose} aria-label="Dismiss">
                <X size={16} />
            </button>
        </div>
    );
}
