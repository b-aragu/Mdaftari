/**
 * PWA Update Prompt Component
 * Shows a notification when a new version of the app is available
 */

import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import './UpdatePrompt.css';

export function UpdatePrompt() {
    const [showPrompt, setShowPrompt] = useState(false);

    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r: ServiceWorkerRegistration | undefined) {
            console.log('SW Registered:', r);
        },
        onRegisterError(error: Error) {
            console.log('SW registration error:', error);
        },
    });

    useEffect(() => {
        if (needRefresh) {
            setShowPrompt(true);
        }
    }, [needRefresh]);

    const handleUpdate = () => {
        updateServiceWorker(true);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        setNeedRefresh(false);
    };

    if (!showPrompt) return null;

    return (
        <div className="update-prompt">
            <div className="update-prompt__content">
                <RefreshCw className="update-prompt__icon" size={20} />
                <div className="update-prompt__text">
                    <strong>New version available!</strong>
                    <span>Refresh to get the latest features</span>
                </div>
                <div className="update-prompt__actions">
                    <button
                        className="update-prompt__btn update-prompt__btn--update"
                        onClick={handleUpdate}
                    >
                        Update
                    </button>
                    <button
                        className="update-prompt__btn update-prompt__btn--dismiss"
                        onClick={handleDismiss}
                        aria-label="Dismiss"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
