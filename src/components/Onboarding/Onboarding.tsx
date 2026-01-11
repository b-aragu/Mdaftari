/**
 * Onboarding Component
 * First-time user tutorial walkthrough
 */

import { useState } from 'react';
import { X, ArrowRight, FileText, Users, TrendingUp, LayoutGrid } from 'lucide-react';
import './Onboarding.css';

interface OnboardingProps {
    onComplete: () => void;
}

interface Slide {
    icon: React.ReactNode;
    title: string;
    description: string;
    tip: string;
}

const slides: Slide[] = [
    {
        icon: <FileText size={48} strokeWidth={1.5} />,
        title: 'Import Payments',
        description: 'Paste M-Pesa messages or upload PDF statements to automatically track your payments.',
        tip: 'Tip: Forward M-Pesa messages to yourself for easy copy-paste',
    },
    {
        icon: <Users size={48} strokeWidth={1.5} />,
        title: 'Track Everyone',
        description: 'View all your transactions grouped by person. Quickly see payment history and outstanding amounts.',
        tip: 'Tip: Tap on a person to see their full payment history',
    },
    {
        icon: <LayoutGrid size={48} strokeWidth={1.5} />,
        title: 'Overview Mode',
        description: 'See your complete financial picture. Compare Collections and Payments in one unified view.',
        tip: 'Tip: Switch to Overview with the toggle at the top',
    },
    {
        icon: <TrendingUp size={48} strokeWidth={1.5} />,
        title: 'Track Your Money',
        description: 'Get insights with reports, charts, and exports. See trends and analyze your cash flow.',
        tip: 'Tip: Export to CSV or PDF from the Reports page',
    },
];

export function Onboarding({ onComplete }: OnboardingProps) {
    const [currentSlide, setCurrentSlide] = useState(0);

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            onComplete();
        }
    };

    const handleSkip = () => {
        onComplete();
    };

    const slide = slides[currentSlide];
    const isLastSlide = currentSlide === slides.length - 1;

    if (!slide) return null;

    return (
        <div className="onboarding-overlay">
            <div className="onboarding-modal">
                <button className="onboarding-skip" onClick={handleSkip}>
                    <X size={20} />
                </button>

                <div className="onboarding-content">
                    <div className="onboarding-icon">{slide.icon}</div>
                    <h2 className="onboarding-title">{slide.title}</h2>
                    <p className="onboarding-description">{slide.description}</p>
                    <p className="onboarding-tip">{slide.tip}</p>
                </div>

                <div className="onboarding-dots">
                    {slides.map((_, idx) => (
                        <button
                            key={idx}
                            className={`onboarding-dot ${idx === currentSlide ? 'onboarding-dot--active' : ''}`}
                            onClick={() => setCurrentSlide(idx)}
                        />
                    ))}
                </div>

                <button className="onboarding-next" onClick={handleNext}>
                    {isLastSlide ? 'Get Started' : 'Next'}
                    <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
}
