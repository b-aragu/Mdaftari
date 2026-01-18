/**
 * Landing Page - Professional Mobile-First Marketing Homepage
 * Uses Mdaftari design tokens and theme
 */

import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, Wifi, Zap, Users, BarChart3, Smartphone, Play, Monitor, Phone } from 'lucide-react';
import './Landing.css';

export function LandingPage() {
    const navigate = useNavigate();

    const handleOpenApp = () => {
        navigate('/app');
    };

    return (
        <div className="landing">
            {/* Navigation */}
            <nav className="landing-nav">
                <div className="landing-nav__logo">
                    <span className="logo-icon">📘</span>
                    <span className="logo-text">Mdaftari</span>
                </div>
                <button className="nav-cta" onClick={handleOpenApp}>
                    Open App
                </button>
            </nav>

            {/* Hero Section */}
            <section className="hero">
                <div className="hero__content">
                    <div className="hero__badge">
                        <span>🇰🇪</span> Built for Kenya
                    </div>

                    <h1 className="hero__title">
                        Track Every<br />
                        <span className="hero__title--accent">Shilling</span>
                    </h1>

                    <p className="hero__subtitle">
                        M-Pesa partial payments and outstanding balances — finally sorted.
                        Stop losing track of who owes you what.
                    </p>

                    <div className="hero__cta-group">
                        <button className="cta-primary" onClick={handleOpenApp}>
                            Start Tracking Free
                            <ArrowRight size={20} />
                        </button>
                        <a href="#demo" className="cta-secondary">
                            <Play size={16} />
                            Watch Demo
                        </a>
                    </div>

                    <div className="hero__trust">
                        <div className="trust-item">
                            <Shield size={16} />
                            <span>100% Private</span>
                        </div>
                        <div className="trust-item">
                            <Wifi size={16} />
                            <span>Works Offline</span>
                        </div>
                        <div className="trust-item">
                            <Zap size={16} />
                            <span>Instant Setup</span>
                        </div>
                    </div>
                </div>

                <div className="hero__visual" onClick={handleOpenApp} role="button" tabIndex={0}>
                    <div className="phone-mockup">
                        <div className="phone-frame">
                            <img
                                src="/pitch-materials/screenshots/mobile_overview.png"
                                alt="Mdaftari Mobile Dashboard - Click to open app"
                                className="phone-screen"
                            />
                        </div>
                        <div className="phone-hint">
                            <span>Click to try it →</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Problem Section */}
            <section className="problem-section">
                <div className="section-container">
                    <h2 className="section-label">The Problem</h2>
                    <h3 className="section-title">Sound Familiar?</h3>

                    <div className="problem-card">
                        <div className="problem-scenario">
                            <p className="scenario-text">
                                <strong>David</strong> owes you <span className="amount">Ksh 50,000</span>
                            </p>
                            <p className="scenario-text">
                                He pays <span className="amount">Ksh 30,000</span>...
                            </p>
                            <p className="scenario-text">
                                Two weeks later, <span className="amount">Ksh 15,000</span> more...
                            </p>
                            <p className="scenario-question">
                                How much does he still owe?<br />
                                <strong>Where did you write it down?</strong>
                            </p>
                        </div>
                    </div>

                    <div className="pain-points">
                        <div className="pain-point">
                            <span className="pain-emoji">📓</span>
                            <span>Lost in notebooks?</span>
                        </div>
                        <div className="pain-point">
                            <span className="pain-emoji">🧠</span>
                            <span>Trusting your memory?</span>
                        </div>
                        <div className="pain-point">
                            <span className="pain-emoji">💬</span>
                            <span>Buried in WhatsApp?</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="features-section">
                <div className="section-container">
                    <h2 className="section-label">The Solution</h2>
                    <h3 className="section-title">One App. Complete Control.</h3>

                    <div className="features-grid">
                        <div className="feature-card feature-card--highlight">
                            <div className="feature-icon">
                                <Smartphone size={32} />
                            </div>
                            <h4>Paste M-Pesa Message</h4>
                            <p>Copy any M-Pesa confirmation, paste it, and we auto-extract everything.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <Users size={32} />
                            </div>
                            <h4>See Who Owes You</h4>
                            <p>Instantly see every person's balance — who paid, who's pending, who's overdue.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <BarChart3 size={32} />
                            </div>
                            <h4>Track Both Sides</h4>
                            <p>Collections, Payments, or Overview — switch between modes in one tap.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Demo Video Section */}
            <section id="demo" className="demo-section">
                <div className="section-container">
                    <h2 className="section-label">See It In Action</h2>
                    <h3 className="section-title">Watch How It Works</h3>

                    <div className="demo-grid">
                        <div className="demo-card">
                            <div className="demo-video-wrapper">
                                <video
                                    src="/pitch-materials/recordings/01_overview_dashboard_demo.webp"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="demo-video"
                                />
                            </div>
                            <h4>Dashboard Overview</h4>
                            <p>See your complete financial picture at a glance</p>
                        </div>

                        <div className="demo-card">
                            <div className="demo-video-wrapper">
                                <video
                                    src="/pitch-materials/recordings/02_mode_switching_demo.webp"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="demo-video"
                                />
                            </div>
                            <h4>Switch Modes</h4>
                            <p>Collections, Payments, or Overview — one tap</p>
                        </div>

                        <div className="demo-card">
                            <div className="demo-video-wrapper">
                                <video
                                    src="/pitch-materials/recordings/03_record_payment_flow.webp"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="demo-video"
                                />
                            </div>
                            <h4>Record Transaction</h4>
                            <p>Paste M-Pesa message, confirm, done!</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* App Preview Section - Desktop View */}
            <section className="preview-section">
                <div className="section-container">
                    <h2 className="section-label">Works Everywhere</h2>
                    <h3 className="section-title">Mobile & Desktop Ready</h3>

                    <div className="preview-tabs">
                        <div className="preview-tab preview-tab--active">
                            <Phone size={18} />
                            <span>Mobile</span>
                        </div>
                        <div className="preview-tab">
                            <Monitor size={18} />
                            <span>Desktop</span>
                        </div>
                    </div>

                    <div className="preview-showcase" onClick={handleOpenApp} role="button" tabIndex={0}>
                        <div className="preview-desktop">
                            <div className="browser-frame">
                                <div className="browser-controls">
                                    <span className="browser-dot"></span>
                                    <span className="browser-dot"></span>
                                    <span className="browser-dot"></span>
                                </div>
                                <img
                                    src="/pitch-materials/screenshots/desktop_overview.png"
                                    alt="Mdaftari Desktop View - Click to open app"
                                    className="preview-image"
                                />
                            </div>
                            <div className="preview-click-hint">
                                <ArrowRight size={16} />
                                <span>Click anywhere to try it</span>
                            </div>
                        </div>

                        <div className="preview-features">
                            <div className="preview-feature">
                                <span className="preview-number">01</span>
                                <div>
                                    <strong>Net Position</strong>
                                    <p>Know instantly if you're ahead or behind</p>
                                </div>
                            </div>
                            <div className="preview-feature">
                                <span className="preview-number">02</span>
                                <div>
                                    <strong>Balance Cards</strong>
                                    <p>Received, Paid Out, Owed — all visible</p>
                                </div>
                            </div>
                            <div className="preview-feature">
                                <span className="preview-number">03</span>
                                <div>
                                    <strong>People List</strong>
                                    <p>Every transaction grouped by person</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="steps-section">
                <div className="section-container">
                    <h2 className="section-label">Getting Started</h2>
                    <h3 className="section-title">3 Simple Steps</h3>

                    <div className="steps-grid">
                        <div className="step">
                            <div className="step-number">1</div>
                            <div className="step-icon">📋</div>
                            <h4>Paste M-Pesa Message</h4>
                            <p>Copy the confirmation SMS you receive after any transaction</p>
                        </div>

                        <div className="step">
                            <div className="step-number">2</div>
                            <div className="step-icon">✅</div>
                            <h4>Confirm Details</h4>
                            <p>We auto-detect amount, name, and date — just verify and save</p>
                        </div>

                        <div className="step">
                            <div className="step-number">3</div>
                            <div className="step-icon">📈</div>
                            <h4>Track Balances</h4>
                            <p>See running totals per person and never lose track again</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust Section */}
            <section className="trust-section">
                <div className="section-container">
                    <h2 className="section-label">Why Mdaftari?</h2>
                    <h3 className="section-title">Built Different</h3>

                    <div className="trust-grid">
                        <div className="trust-card">
                            <div className="trust-icon">
                                <Wifi size={24} />
                            </div>
                            <div>
                                <h4>Works Offline</h4>
                                <p>No internet? No problem. All data stored locally on your device.</p>
                            </div>
                        </div>

                        <div className="trust-card">
                            <div className="trust-icon">
                                <Shield size={24} />
                            </div>
                            <div>
                                <h4>100% Private</h4>
                                <p>Your financial data never leaves your phone. We can't see it.</p>
                            </div>
                        </div>

                        <div className="trust-card">
                            <div className="trust-icon">
                                <Zap size={24} />
                            </div>
                            <div>
                                <h4>Free Forever</h4>
                                <p>No subscriptions, no hidden fees. Just start using it.</p>
                            </div>
                        </div>

                        <div className="trust-card">
                            <div className="trust-icon">
                                <Users size={24} />
                            </div>
                            <div>
                                <h4>No Account Needed</h4>
                                <p>Open the app and start tracking. No signup required.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="final-cta">
                <div className="section-container">
                    <h2 className="final-cta__title">
                        Ready to stop losing track of money?
                    </h2>
                    <p className="final-cta__subtitle">
                        Join thousands of Kenyans who finally know exactly who owes them what.
                    </p>

                    <button className="cta-primary cta-primary--large" onClick={handleOpenApp}>
                        Start Tracking Now — It's Free
                        <ArrowRight size={24} />
                    </button>

                    <p className="final-cta__note">
                        No signup • Works offline • Data stays on your device
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-content">
                    <div className="footer-brand">
                        <span className="logo-icon">📘</span>
                        <span className="logo-text">Mdaftari</span>
                        <span className="footer-tagline">Track Every Shilling</span>
                    </div>

                    <div className="footer-links">
                        <a
                            href="https://github.com/b-aragu/Mdaftari"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            GitHub
                        </a>
                    </div>

                    <p className="footer-copy">
                        Built with ❤️ for Kenya 🇰🇪 • © 2026 Mdaftari
                    </p>
                </div>
            </footer>
        </div>
    );
}
