/**
 * Card Component - Premium Finance Style
 */

import React from 'react';
import './Card.css';

export interface CardProps {
    variant?: 'elevated' | 'outlined' | 'flat' | 'finance' | 'glass';
    financeColor?: 'primary' | 'success' | 'warning' | 'danger';
    padding?: 'sm' | 'md' | 'lg' | 'none';
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export function Card({
    variant = 'elevated',
    financeColor,
    padding = 'md',
    children,
    className = '',
    onClick,
}: CardProps) {
    const classes = [
        'card',
        `card--${variant}`,
        `card--padding-${padding}`,
        financeColor && `card--finance-${financeColor}`,
        onClick && 'card--clickable',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    const Component = onClick ? 'button' : 'div';

    return (
        <Component className={classes} onClick={onClick}>
            {children}
        </Component>
    );
}

export interface CardHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    icon?: React.ReactNode;
}

export function CardHeader({ title, subtitle, action, icon }: CardHeaderProps) {
    return (
        <div className="card__header">
            <div className="card__header-text">
                {icon && <span className="card__icon">{icon}</span>}
                <h3 className="card__title">{title}</h3>
                {subtitle && <p className="card__subtitle">{subtitle}</p>}
            </div>
            {action && <div className="card__header-action">{action}</div>}
        </div>
    );
}

export function CardContent({ children }: { children: React.ReactNode }) {
    return <div className="card__content">{children}</div>;
}

export function CardFooter({ children }: { children: React.ReactNode }) {
    return <div className="card__footer">{children}</div>;
}
