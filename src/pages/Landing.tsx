/**
 * Landing Page - Mobile-First Marketing Homepage
 * Shows before users enter the main app
 */

import { useNavigate } from 'react-router-dom';
import './Landing.css';

export function LandingPage() {
    const navigate = useNavigate();

    const handleOpenApp = () => {
        navigate('/app');
    };

    return (
        <div className="landing">
            {/* Hero Section */}
            <section className="landing-hero">
                <div className="landing-hero__content">
                    <h1 className="landing-logo">📘 Mdaftari</h1>
                    <p className="landing-headline">Track Every Shilling</p>
                    <p className="landing-subheadline">
                        M-Pesa partial payments & balances — sorted.
                    </p>

                    <button className="landing-cta landing-cta--primary" onClick={handleOpenApp}>
                        Open App →
                    </button>

                    <a href="#problem" className="landing-cta--secondary">
                        See How It Works ↓
                    </a>

                    <div className="landing-trust-badge">
                        🔒 Offline-first • Your data stays on your device
                    </div>
                </div>
            </section>

            {/* Problem Section */}
            <section id="problem" className="landing-section landing-section--problem">
                <h2 className="section-heading">Sound familiar?</h2>

                <div className="scenario-card">
                    <p className="scenario-text">
                        "David owes you <strong>50,000</strong>. He pays <strong>30,000</strong>.
                        Two weeks later, <strong>15,000</strong> more."
                    </p>
                    <p className="scenario-question">
                        How much does he still owe? Where did you write it down?
                    </p>
                </div>

                <div className="pain-points">
                    <div className="pain-point">
                        <span className="pain-icon">📓</span>
                        <span className="pain-text">Written in a notebook?</span>
                    </div>
                    <div className="pain-point">
                        <span className="pain-icon">🧠</span>
                        <span className="pain-text">Stored in your head?</span>
                    </div>
                    <div className="pain-point">
                        <span className="pain-icon">💬</span>
                        <span className="pain-text">Lost in WhatsApp?</span>
                    </div>
                </div>
            </section>

            {/* Solution Section */}
            <section className="landing-section landing-section--solution">
                <h2 className="section-heading">The Solution</h2>

                <div className="feature-cards">
                    <div className="feature-card">
                        <span className="feature-icon">📲</span>
                        <h3>Paste M-Pesa Message</h3>
                        <p>Auto-tracks balance instantly</p>
                    </div>
                    <div className="feature-card">
                        <span className="feature-icon">👥</span>
                        <h3>See Who Owes You</h3>
                        <p>All balances at a glance</p>
                    </div>
                    <div className="feature-card">
                        <span className="feature-icon">📊</span>
                        <h3>3 Powerful Modes</h3>
                        <p>Collections, Payments, Overview</p>
                    </div>
                </div>
            </section>

            {/* App Preview */}
            <section className="landing-section landing-section--preview">
                <h2 className="section-heading">Your Complete Picture</h2>
                <div className="app-preview">
                    <img
                        src="/pitch-materials/screenshots/01_overview_dashboard.png"
                        alt="Mdaftari Dashboard showing balance overview"
                        className="preview-image"
                    />
                    <p className="preview-caption">Works offline • Updates instantly</p>
                </div>
            </section>

            {/* How It Works */}
            <section className="landing-section landing-section--steps">
                <h2 className="section-heading">How It Works</h2>

                <div className="steps">
                    <div className="step">
                        <span className="step-number">1</span>
                        <span className="step-icon">📋</span>
                        <p className="step-text">Paste your M-Pesa message</p>
                    </div>
                    <div className="step">
                        <span className="step-number">2</span>
                        <span className="step-icon">✅</span>
                        <p className="step-text">Confirm the details</p>
                    </div>
                    <div className="step">
                        <span className="step-number">3</span>
                        <span className="step-icon">📈</span>
                        <p className="step-text">See your running balance</p>
                    </div>
                </div>
            </section>

            {/* Trust Features */}
            <section className="landing-section landing-section--trust">
                <h2 className="section-heading">Why Mdaftari?</h2>

                <ul className="trust-list">
                    <li className="trust-item">
                        <span className="trust-check">✅</span>
                        <span>Works offline (even in low network areas)</span>
                    </li>
                    <li className="trust-item">
                        <span className="trust-check">✅</span>
                        <span>Privacy-first (data never leaves your phone)</span>
                    </li>
                    <li className="trust-item">
                        <span className="trust-check">✅</span>
                        <span>Free to use</span>
                    </li>
                    <li className="trust-item">
                        <span className="trust-check">✅</span>
                        <span>No login required</span>
                    </li>
                </ul>
            </section>

            {/* Final CTA */}
            <section className="landing-section landing-section--final-cta">
                <h2 className="final-cta-heading">Ready to stop losing track?</h2>

                <button className="landing-cta landing-cta--primary landing-cta--large" onClick={handleOpenApp}>
                    Open Mdaftari →
                </button>

                <p className="final-cta-note">
                    Instant access • No signup • Works offline
                </p>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <p>Built for Kenya 🇰🇪</p>
                <a
                    href="https://github.com/b-aragu/Mdaftari"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-link"
                >
                    GitHub
                </a>
                <p className="footer-copy">© 2026 Mdaftari</p>
            </footer>
        </div>
    );
}
