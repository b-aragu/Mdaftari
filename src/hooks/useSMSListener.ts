import { useState, useEffect } from 'react';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { parseMpesaMessage, isMpesaMessage } from '../parser/mpesa';
import type { ParsedTransaction } from '../parser/types';

interface SMSListenerResult {
    latestTransaction: ParsedTransaction | null;
    latestRawMessage: string | null;
    clearTransaction: () => void;
}

export function useSMSListener(): SMSListenerResult {
    const [latestTransaction, setLatestTransaction] = useState<ParsedTransaction | null>(null);
    const [latestRawMessage, setLatestRawMessage] = useState<string | null>(null);


    // Check for pending SMS (launched from notification)
    useEffect(() => {
        const checkPending = async () => {
            try {
                const { value } = await Preferences.get({ key: 'pending_sms_body' });
                if (value) {
                    // Always set raw message so we can at least navigate
                    setLatestRawMessage(value);

                    if (isMpesaMessage(value)) {
                        const result = parseMpesaMessage(value);
                        if (result.success && result.transaction) {
                            setLatestTransaction(result.transaction);
                        } else {
                            // Parsing failed, but we still have raw message
                        }
                    }
                    // Clear it so we don't process it again on reload
                    await Preferences.remove({ key: 'pending_sms_body' });
                }
            } catch (_err) {
                // Silent fail
            }
        };

        checkPending();

        // Also check on app resume (for when app was in background)
        const listener = App.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
            if (isActive) {
                checkPending();
            }
        });

        return () => {
            listener.then((l: any) => l.remove());
        };
    }, []);

    // Request notification permissions on mount
    useEffect(() => {
        const checkPermission = async () => {
            try {
                const status = await LocalNotifications.checkPermissions();
                if (status.display !== 'granted') {
                    await LocalNotifications.requestPermissions();
                }
            } catch (_err) {
                // Silent fail
            }
        };
        checkPermission();
    }, []);

    useEffect(() => {
        const handleSMS = (event: Event) => {
            const customEvent = event as CustomEvent;
            const body = customEvent.detail?.body;

            if (body) {
                // Always set raw message
                setLatestRawMessage(body);

                if (isMpesaMessage(body)) {
                    const result = parseMpesaMessage(body);
                    if (result.success && result.transaction) {
                        setLatestTransaction(result.transaction);
                    }
                }
            }
        };

        window.addEventListener('smsReceived', handleSMS);

        return () => {
            window.removeEventListener('smsReceived', handleSMS);
        };
    }, []);

    const clearTransaction = () => {
        setLatestTransaction(null);
        setLatestRawMessage(null);
    };

    return { latestTransaction, latestRawMessage, clearTransaction };
}
