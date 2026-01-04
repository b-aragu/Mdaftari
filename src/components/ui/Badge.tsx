/**
 * Badge Component
 * 
 * Status badges for transaction types and sync status
 */

import React from 'react';
import './Badge.css';

export interface BadgeProps {
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
    size?: 'sm' | 'md';
    children: React.ReactNode;
}

export function Badge({
    variant = 'default',
    size = 'md',
    children,
}: BadgeProps) {
    return (
        <span className={`badge badge--${variant} badge--${size}`}>
            {children}
        </span>
    );
}

// Semantic badge shortcuts
export function SuccessBadge({ children }: { children: React.ReactNode }) {
    return <Badge variant="success">{children}</Badge>;
}

export function WarningBadge({ children }: { children: React.ReactNode }) {
    return <Badge variant="warning">{children}</Badge>;
}

export function ErrorBadge({ children }: { children: React.ReactNode }) {
    return <Badge variant="error">{children}</Badge>;
}

// Transaction type badges
export function ReceivedBadge() {
    return <Badge variant="success">Received</Badge>;
}

export function SentBadge() {
    return <Badge variant="info">Sent</Badge>;
}

export function PartialBadge() {
    return <Badge variant="warning">Partial</Badge>;
}

export function OwedBadge() {
    return <Badge variant="error">Owed</Badge>;
}
