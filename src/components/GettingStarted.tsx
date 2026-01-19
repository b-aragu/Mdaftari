/**
 * GettingStarted Component
 * 
 * Onboarding hub for new users to import data quickly.
 */

import { MessageSquare, FileText, ChevronRight, Sparkles } from 'lucide-react';
import './GettingStarted.css';
import { requestSMSPermission } from '../services/sms-reader';

interface GettingStartedProps {
    onImportSMS: () => void;
    onImportStatement: () => void;
    onRecordPayment: () => void;
}

export function GettingStarted({ onImportSMS, onImportStatement, onRecordPayment }: GettingStartedProps) {

    const handleSMSClick = async () => {
        // Optimistic permission check
        try {
            await requestSMSPermission();
        } catch (e) {
            // Ignore, ImportSMS page handles it too
        }
        onImportSMS();
    };

    return (
        <div className="getting-started">
            <div className="getting-started__icon-wrapper">
                <Sparkles size={40} strokeWidth={1.5} />
            </div>

            <h2 className="getting-started__title">Let's find your money</h2>
            <p className="getting-started__desc">
                Import your M-Pesa messages to instantly see who owes you money and track your payments.
            </p>

            <div className="getting-started__steps">
                {/* Step 1: SMS Import (Primary) */}
                <button className="getting-started__btn getting-started__btn--primary" onClick={handleSMSClick}>
                    <div className="getting-started__btn-content">
                        <div className="getting-started__btn-icon">
                            <MessageSquare size={20} />
                        </div>
                        <div className="getting-started__btn-text">
                            <span className="getting-started__btn-label">Import from SMS</span>
                            <span className="getting-started__btn-sub">Magically scan M-Pesa messages</span>
                        </div>
                    </div>
                    <ChevronRight size={20} className="getting-started__btn-arrow" />
                </button>

                {/* Step 2: Statement Upload */}
                <button className="getting-started__btn" onClick={onImportStatement}>
                    <div className="getting-started__btn-content">
                        <div className="getting-started__btn-icon">
                            <FileText size={20} />
                        </div>
                        <div className="getting-started__btn-text">
                            <span className="getting-started__btn-label">Upload Statement</span>
                            <span className="getting-started__btn-sub">Import PDF from Safaricom</span>
                        </div>
                    </div>
                    <ChevronRight size={20} className="getting-started__btn-arrow" />
                </button>

            </div>

            <button className="getting-started__secondary" onClick={onRecordPayment}>
                Or record a manual payment
            </button>

            <div className="getting-started__feedback">
                <a href="https://form.jotform.com/260185803266054" target="_blank" rel="noopener noreferrer">
                    Have feedback? Let us know
                </a>
            </div>
        </div>
    );
}
