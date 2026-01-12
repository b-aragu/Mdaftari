/**
 * Main Layout Component
 */

import { ReactNode } from 'react';
import { Navigation } from './Navigation';
import './Layout.css';

interface LayoutProps {
    children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
    return (
        <div className="layout">
            <main className="layout-main">
                {children}
            </main>
            <Navigation />
        </div>
    );
}
