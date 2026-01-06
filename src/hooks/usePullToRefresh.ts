/**
 * Pull-to-Refresh Hook
 * 
 * Provides pull-to-refresh functionality for mobile
 */

import { useState, useCallback, useRef, useEffect } from 'react';

interface PullToRefreshOptions {
    onRefresh: () => Promise<void>;
    threshold?: number;
    containerRef?: React.RefObject<HTMLElement>;
}

interface PullToRefreshState {
    isPulling: boolean;
    isRefreshing: boolean;
    pullDistance: number;
}

export function usePullToRefresh({
    onRefresh,
    threshold = 80,
    containerRef,
}: PullToRefreshOptions): PullToRefreshState & {
    refreshIndicatorProps: {
        style: React.CSSProperties;
    };
} {
    const [state, setState] = useState<PullToRefreshState>({
        isPulling: false,
        isRefreshing: false,
        pullDistance: 0,
    });

    const startY = useRef(0);
    const currentY = useRef(0);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        // Only start if at top of scroll
        const scrollTop = containerRef?.current?.scrollTop ?? window.scrollY;
        if (scrollTop <= 0 && e.touches[0]) {
            startY.current = e.touches[0].clientY;
            setState(prev => ({ ...prev, isPulling: true }));
        }
    }, [containerRef]);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!state.isPulling || state.isRefreshing || !e.touches[0]) return;

        currentY.current = e.touches[0].clientY;
        const distance = Math.max(0, currentY.current - startY.current);

        // Apply resistance - diminishing returns as you pull further
        const resistance = 0.5;
        const pullDistance = Math.min(distance * resistance, threshold * 1.5);

        setState(prev => ({ ...prev, pullDistance }));
    }, [state.isPulling, state.isRefreshing, threshold]);

    const handleTouchEnd = useCallback(async () => {
        if (!state.isPulling) return;

        if (state.pullDistance >= threshold && !state.isRefreshing) {
            setState(prev => ({ ...prev, isRefreshing: true, pullDistance: threshold }));

            try {
                await onRefresh();
            } finally {
                setState({
                    isPulling: false,
                    isRefreshing: false,
                    pullDistance: 0,
                });
            }
        } else {
            setState({
                isPulling: false,
                isRefreshing: false,
                pullDistance: 0,
            });
        }
    }, [state.isPulling, state.pullDistance, state.isRefreshing, threshold, onRefresh]);

    useEffect(() => {
        const container = containerRef?.current ?? document;

        container.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true });
        container.addEventListener('touchmove', handleTouchMove as EventListener, { passive: true });
        container.addEventListener('touchend', handleTouchEnd as EventListener);

        return () => {
            container.removeEventListener('touchstart', handleTouchStart as EventListener);
            container.removeEventListener('touchmove', handleTouchMove as EventListener);
            container.removeEventListener('touchend', handleTouchEnd as EventListener);
        };
    }, [containerRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

    const refreshIndicatorProps = {
        style: {
            transform: `translateY(${state.pullDistance}px)`,
            transition: state.isPulling ? 'none' : 'transform 0.3s ease-out',
        } as React.CSSProperties,
    };

    return {
        ...state,
        refreshIndicatorProps,
    };
}
