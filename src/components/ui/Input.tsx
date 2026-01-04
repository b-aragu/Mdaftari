/**
 * Input Component
 * 
 * Form input with label and validation support
 */

import React from 'react';
import './Input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    hint?: string;
    fullWidth?: boolean;
}

export function Input({
    label,
    error,
    hint,
    fullWidth = true,
    id,
    className = '',
    required,
    ...props
}: InputProps) {
    const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    const classes = [
        'input-wrapper',
        fullWidth && 'input-wrapper--full-width',
        error && 'input-wrapper--error',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={classes}>
            <label htmlFor={inputId} className="input__label">
                {label}
                {required && <span className="input__required" aria-hidden="true"> *</span>}
            </label>

            <input
                id={inputId}
                className="input__field"
                aria-describedby={error ? errorId : hint ? hintId : undefined}
                aria-invalid={!!error}
                required={required}
                {...props}
            />

            {error && (
                <p id={errorId} className="input__error" role="alert">
                    {error}
                </p>
            )}

            {hint && !error && (
                <p id={hintId} className="input__hint">
                    {hint}
                </p>
            )}
        </div>
    );
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
    error?: string;
    hint?: string;
    fullWidth?: boolean;
}

export function Textarea({
    label,
    error,
    hint,
    fullWidth = true,
    id,
    className = '',
    required,
    ...props
}: TextareaProps) {
    const inputId = id || `textarea-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    const classes = [
        'input-wrapper',
        fullWidth && 'input-wrapper--full-width',
        error && 'input-wrapper--error',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={classes}>
            <label htmlFor={inputId} className="input__label">
                {label}
                {required && <span className="input__required" aria-hidden="true"> *</span>}
            </label>

            <textarea
                id={inputId}
                className="input__field input__field--textarea"
                aria-describedby={error ? errorId : hint ? hintId : undefined}
                aria-invalid={!!error}
                required={required}
                {...props}
            />

            {error && (
                <p id={errorId} className="input__error" role="alert">
                    {error}
                </p>
            )}

            {hint && !error && (
                <p id={hintId} className="input__hint">
                    {hint}
                </p>
            )}
        </div>
    );
}
