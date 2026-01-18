/**
 * EmptyState - Reusable component for empty/no-data states
 * Shows an icon, message, and optional action button
 */

import React from 'react';
import './EmptyState.css';

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    size = 'md'
}: EmptyStateProps) {
    return (
        <div className={`empty-state empty-state--${size}`}>
            <div className="empty-state__icon">
                {icon}
            </div>
            <h3 className="empty-state__title">{title}</h3>
            {description && (
                <p className="empty-state__description">{description}</p>
            )}
            {action && (
                <button
                    className="empty-state__action"
                    onClick={action.onClick}
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}
