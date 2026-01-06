/**
 * Skeleton Loading Components
 * 
 * Provides shimmer loading states that match component dimensions
 */

import './Skeleton.css';

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    className?: string;
}

export function Skeleton({ width, height, className = '' }: SkeletonProps) {
    return (
        <div
            className={`skeleton ${className}`}
            style={{
                width: typeof width === 'number' ? `${width}px` : width,
                height: typeof height === 'number' ? `${height}px` : height,
            }}
        />
    );
}

interface SkeletonTextProps {
    width?: string;
    lines?: number;
    className?: string;
}

export function SkeletonText({ width = '100%', lines = 1, className = '' }: SkeletonTextProps) {
    return (
        <div className={`skeleton-text-group ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className="skeleton skeleton-text"
                    style={{
                        width: i === lines - 1 && lines > 1 ? '60%' : width,
                    }}
                />
            ))}
        </div>
    );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
    return (
        <div className={`skeleton-card ${className}`}>
            <div className="skeleton-card-header">
                <Skeleton width={100} height={14} />
            </div>
            <Skeleton width="60%" height={32} />
        </div>
    );
}

export function SkeletonPersonCard({ className = '' }: { className?: string }) {
    return (
        <div className={`skeleton-person-card ${className}`}>
            <div className="skeleton-person-info">
                <Skeleton width={120} height={16} />
                <Skeleton width={80} height={12} />
            </div>
            <div className="skeleton-person-totals">
                <Skeleton width={90} height={16} />
                <Skeleton width={70} height={12} />
            </div>
        </div>
    );
}
