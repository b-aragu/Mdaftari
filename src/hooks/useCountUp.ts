/**
 * useCountUp Hook
 * 
 * Animates a number from 0 to the target value using requestAnimationFrame
 * for smooth 60fps animation.
 */

import { useState, useEffect, useRef } from 'react';

export function useCountUp(
    end: number,
    duration: number = 1000,
    enabled: boolean = true
): number {
    const [count, setCount] = useState(0);
    const startTimeRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (!enabled || end === 0) {
            setCount(end);
            return;
        }

        // Reset for new animation
        setCount(0);
        startTimeRef.current = null;

        const animate = (timestamp: number) => {
            if (!startTimeRef.current) {
                startTimeRef.current = timestamp;
            }

            const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);

            // Ease-out cubic for smooth deceleration
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.round(eased * end);

            setCount(currentValue);

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            }
        };

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [end, duration, enabled]);

    return count;
}
