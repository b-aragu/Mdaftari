/**
 * Landing Page - Professional Mobile-First Marketing Homepage
 * Uses Mdaftari design tokens and theme
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, Wifi, Zap, Users, BarChart3, Smartphone, Play, Monitor, Phone, X } from 'lucide-react';
import './Landing.css';

// GitHub raw URLs for demo videos
const DEMO_VIDEOS = {
    overview: 'https://github.com/b-aragu/Mdaftari/raw/main/pitch-materials/recordings/overview.webm',
    collections: 'https://github.com/b-aragu/Mdaftari/raw/main/pitch-materials/recordings/collections.webm',
    payments: 'https://github.com/b-aragu/Mdaftari/raw/main/pitch-materials/recordings/payments.webm',
    recordPayment: 'https://github.com/b-aragu/Mdaftari/raw/main/pitch-materials/recordings/recordpayment.webm',
};

type ModalContent = {
    type: 'image' | 'video';
    src: string;
    title: string;
} | null;

export function LandingPage() {
    const navigate = useNavigate();
    const [activePreview, setActivePreview] = useState<'mobile' | 'desktop'>('mobile');
    const [modalContent, setModalContent] = useState<ModalContent>(null);

    const handleOpenApp = () => {
        navigate('/app');
    };

    const openImageModal = (src: string, title: string) => {
        setModalContent({ type: 'image', src, title });
    };

    const openVideoModal = (src: string, title: string) => {
        setModalContent({ type: 'video', src, title });
    };

    const closeModal = () => {
        setModalContent(null);
    };

    return (
        <div className="landing">
            {/* Modal for fullscreen view */}
            {modalContent && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={closeModal}>
                            <X size={24} />
                        </button>
                        <h3 className="modal-title">{modalContent.title}</h3>
                        {modalContent.type === 'image' ? (
                            <img
                                src={modalContent.src}
                                alt={modalContent.title}
                                className="modal-image"
                            />
                        ) : (
                            <video
                                src={modalContent.src}
                                controls
                                autoPlay
                                className="modal-video"
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Navigation */}
            <nav className="landing-nav">
                <div className="landing-nav__logo">
                    <img src="/logo.png" alt="Mdaftari" className="logo-img" />
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

                <div
                    className="hero__visual"
                    onClick={() => openImageModal('/pitch-materials/screenshots/mobile_overview.png', 'Mdaftari Mobile Dashboard')}
                    role="button"
                    tabIndex={0}
                >
                    <div className="phone-mockup">
                        <div className="phone-frame">
                            <img
                                src="/pitch-materials/screenshots/mobile_overview.png"
                                alt="Mdaftari Mobile Dashboard - Click to view full size"
                                className="phone-screen"
                            />
                        </div>
                        <div className="phone-hint">
                            <span>Click to view full size</span>
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
                        <div
                            className="demo-card"
                            onClick={() => openVideoModal(DEMO_VIDEOS.overview, 'Overview Mode')}
                        >
                            <div className="demo-video-wrapper">
                                <div className="demo-thumbnail">
                                    <img
                                        src="/pitch-materials/screenshots/01_overview_dashboard.png"
                                        alt="Overview Mode"
                                    />
                                    <div className="demo-play-button">
                                        <Play size={32} />
                                    </div>
                                </div>
                            </div>
                            <h4>Overview Mode</h4>
                            <p>See your complete financial picture at a glance</p>
                        </div>

                        <div
                            className="demo-card"
                            onClick={() => openVideoModal(DEMO_VIDEOS.collections, 'Collections Mode')}
                        >
                            <div className="demo-video-wrapper">
                                <div className="demo-thumbnail">
                                    <img
                                        src="/pitch-materials/screenshots/02_collections_mode.png"
                                        alt="Collections Mode"
                                    />
                                    <div className="demo-play-button">
                                        <Play size={32} />
                                    </div>
                                </div>
                            </div>
                            <h4>Collections Mode</h4>
                            <p>Track money coming in from customers</p>
                        </div>

                        <div
                            className="demo-card"
                            onClick={() => openVideoModal(DEMO_VIDEOS.payments, 'Payments Mode')}
                        >
                            <div className="demo-video-wrapper">
                                <div className="demo-thumbnail">
                                    <img
                                        src="/pitch-materials/screenshots/03_payments_mode.png"
                                        alt="Payments Mode"
                                    />
                                    <div className="demo-play-button">
                                        <Play size={32} />
                                    </div>
                                </div>
                            </div>
                            <h4>Payments Mode</h4>
                            <p>Track money going out to suppliers</p>
                        </div>

                        <div
                            className="demo-card"
                            onClick={() => openVideoModal(DEMO_VIDEOS.recordPayment, 'Record Transaction')}
                        >
                            <div className="demo-video-wrapper">
                                <div className="demo-thumbnail">
                                    <img
                                        src="/pitch-materials/screenshots/06_record_payment_result.png"
                                        alt="Record Transaction"
                                    />
                                    <div className="demo-play-button">
                                        <Play size={32} />
                                    </div>
                                </div>
                            </div>
                            <h4>Record Transaction</h4>
                            <p>Paste M-Pesa message, confirm, done!</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* App Preview Section - Mobile/Desktop Toggle */}
            <section className="preview-section">
                <div className="section-container">
                    <h2 className="section-label">Works Everywhere</h2>
                    <h3 className="section-title">Mobile & Desktop Ready</h3>

                    <div className="preview-tabs">
                        <button
                            className={`preview-tab ${activePreview === 'mobile' ? 'preview-tab--active' : ''}`}
                            onClick={() => setActivePreview('mobile')}
                        >
                            <Phone size={18} />
                            <span>Mobile</span>
                        </button>
                        <button
                            className={`preview-tab ${activePreview === 'desktop' ? 'preview-tab--active' : ''}`}
                            onClick={() => setActivePreview('desktop')}
                        >
                            <Monitor size={18} />
                            <span>Desktop</span>
                        </button>
                    </div>

                    <div className="preview-showcase">
                        {activePreview === 'mobile' ? (
                            <div
                                className="preview-mobile"
                                onClick={() => openImageModal('/pitch-materials/screenshots/mobile_overview.png', 'Mdaftari Mobile View')}
                            >
                                <div className="phone-frame phone-frame--large">
                                    <img
                                        src="/pitch-materials/screenshots/mobile_overview.png"
                                        alt="Mdaftari Mobile View - Click to view full size"
                                        className="phone-screen"
                                    />
                                </div>
                                <div className="preview-hint">Click to view full size</div>
                            </div>
                        ) : (
                            <div
                                className="preview-desktop"
                                onClick={() => openImageModal('/pitch-materials/screenshots/desktop_overview.png', 'Mdaftari Desktop View')}
                            >
                                <div className="browser-frame">
                                    <div className="browser-controls">
                                        <span className="browser-dot"></span>
                                        <span className="browser-dot"></span>
                                        <span className="browser-dot"></span>
                                    </div>
                                    <img
                                        src="/pitch-materials/screenshots/desktop_overview.png"
                                        alt="Mdaftari Desktop View - Click to view full size"
                                        className="preview-image"
                                    />
                                </div>
                                <div className="preview-hint">Click to view full size</div>
                            </div>
                        )}

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
                            <div className="trust-content">
                                <h4>Works Offline</h4>
                                <p>No internet? No problem. All data stored locally.</p>
                            </div>
                        </div>

                        <div className="trust-card">
                            <div className="trust-icon">
                                <Shield size={24} />
                            </div>
                            <div className="trust-content">
                                <h4>100% Private</h4>
                                <p>Your data never leaves your device. We can't see it.</p>
                            </div>
                        </div>

                        <div className="trust-card">
                            <div className="trust-icon">
                                <Zap size={24} />
                            </div>
                            <div className="trust-content">
                                <h4>Free Forever</h4>
                                <p>No subscriptions, no hidden fees. Just use it.</p>
                            </div>
                        </div>

                        <div className="trust-card">
                            <div className="trust-icon">
                                <Users size={24} />
                            </div>
                            <div className="trust-content">
                                <h4>No Account Needed</h4>
                                <p>Open the app and start tracking. No signup.</p>
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
                        <img src="/logo.png" alt="Mdaftari" className="logo-img" />
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
