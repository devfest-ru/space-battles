import React, { useState } from 'react';
import { useT } from '../i18n/LanguageContext';

function IntroTutorial({ onClose }) {
  const { t } = useT();
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: t('tutorial.steps.welcome.title'),
      icon: '🚀',
      content: (
        <>
          <p className="intro-highlight">
            {t('tutorial.steps.welcome.highlight')}
          </p>
          <div className="intro-features">
            <div className="intro-feature">
              <span className="feature-icon">🤖</span>
              <span>{t('tutorial.steps.welcome.f1')}</span>
            </div>
            <div className="intro-feature">
              <span className="feature-icon">🎯</span>
              <span>{t('tutorial.steps.welcome.f2')}</span>
            </div>
            <div className="intro-feature">
              <span className="feature-icon">🏆</span>
              <span>{t('tutorial.steps.welcome.f3')}</span>
            </div>
          </div>
        </>
      ),
    },
    {
      title: t('tutorial.steps.api.title'),
      icon: '📡',
      content: (
        <>
          <p className="intro-highlight">
            {t('tutorial.steps.api.highlight')}
          </p>
          <div className="intro-code-block">
            <div className="code-section-title">{t('tutorial.steps.api.sensorsTitle')}</div>
            <pre>{`ship.x, ship.y      // Position
ship.bodyAngle      // Direction (degrees)
ship.health         // Remaining health (1-3)
ship.canShoot       // Ready to fire?`}</pre>
          </div>
          <div className="intro-code-block">
            <div className="code-section-title">{t('tutorial.steps.api.commandsTitle')}</div>
            <pre>{`return {
  rotate: 1 / -1,   // Turn right / left
  boost: 1,         // Extra speed
  shoot: true       // Fire rocket!
}`}</pre>
          </div>
        </>
      ),
    },
    {
      title: t('tutorial.steps.simulator.title'),
      icon: '🔬',
      content: (
        <>
          <p className="intro-highlight">
            {t('tutorial.steps.simulator.highlight')}
          </p>
          <div className="intro-steps">
            <div className="intro-step">
              <span className="step-num">1</span>
              <span>
                {t('tutorial.steps.simulator.s1Pre')}
                <strong>{t('tutorial.steps.simulator.s1Strong')}</strong>
                {t('tutorial.steps.simulator.s1Post')}
              </span>
            </div>
            <div className="intro-step">
              <span className="step-num">2</span>
              <span>
                {t('tutorial.steps.simulator.s2Pre')}
                <strong>{t('tutorial.steps.simulator.s2Strong')}</strong>
                {t('tutorial.steps.simulator.s2Post')}
              </span>
            </div>
            <div className="intro-step">
              <span className="step-num">3</span>
              <span>
                {t('tutorial.steps.simulator.s3Pre')}
                <strong>{t('tutorial.steps.simulator.s3Strong')}</strong>
                {t('tutorial.steps.simulator.s3Post')}
              </span>
            </div>
            <div className="intro-step">
              <span className="step-num">4</span>
              <span>
                {t('tutorial.steps.simulator.s4Pre')}
                <strong>{t('tutorial.steps.simulator.s4Strong')}</strong>
                {t('tutorial.steps.simulator.s4Post')}
              </span>
            </div>
          </div>
        </>
      ),
    },
    {
      title: t('tutorial.steps.championship.title'),
      icon: '⚔️',
      content: (
        <>
          <p className="intro-highlight">
            {t('tutorial.steps.championship.highlight')}
          </p>
          <div className="intro-steps">
            <div className="intro-step">
              <span className="step-num">1</span>
              <span>
                <strong>{t('tutorial.steps.championship.s1Strong')}</strong>
                {t('tutorial.steps.championship.s1Post')}
              </span>
            </div>
            <div className="intro-step">
              <span className="step-num">2</span>
              <span>
                <strong>{t('tutorial.steps.championship.s2Strong')}</strong>
                {t('tutorial.steps.championship.s2Post')}
              </span>
            </div>
            <div className="intro-step">
              <span className="step-num">3</span>
              <span>
                <strong>{t('tutorial.steps.championship.s3Strong')}</strong>
                {t('tutorial.steps.championship.s3Post')}
              </span>
            </div>
            <div className="intro-step">
              <span className="step-num">4</span>
              <span>
                <strong>{t('tutorial.steps.championship.s4Strong')}</strong>
                {t('tutorial.steps.championship.s4Post')}
              </span>
            </div>
          </div>
          <p className="intro-tip">
            {t('tutorial.steps.championship.tip')}
          </p>
        </>
      ),
    },
    {
      title: t('tutorial.steps.tips.title'),
      icon: '💡',
      content: (
        <>
          <p className="intro-highlight">
            {t('tutorial.steps.tips.highlight')}
          </p>
          <div className="intro-tips-grid">
            <div className="tip-card">
              <span className="tip-icon">🎯</span>
              <strong>{t('tutorial.steps.tips.t1Title')}</strong>
              <span>{t('tutorial.steps.tips.t1Desc')}</span>
            </div>
            <div className="tip-card">
              <span className="tip-icon">🔄</span>
              <strong>{t('tutorial.steps.tips.t2Title')}</strong>
              <span>{t('tutorial.steps.tips.t2Desc')}</span>
            </div>
            <div className="tip-card">
              <span className="tip-icon">❤️</span>
              <strong>{t('tutorial.steps.tips.t3Title')}</strong>
              <span>{t('tutorial.steps.tips.t3Desc')}</span>
            </div>
            <div className="tip-card">
              <span className="tip-icon">🎪</span>
              <strong>{t('tutorial.steps.tips.t4Title')}</strong>
              <span>{t('tutorial.steps.tips.t4Desc')}</span>
            </div>
          </div>
        </>
      ),
    },
  ];

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    setStep((s) => Math.max(0, s - 1));
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="intro-overlay">
      <div className="intro-modal">
        <button className="intro-skip" onClick={handleSkip}>
          {t('tutorial.skip')}
        </button>

        <div className="intro-header">
          <span className="intro-icon">{currentStep.icon}</span>
          <h2>{currentStep.title}</h2>
        </div>

        <div className="intro-content">
          {currentStep.content}
        </div>

        <div className="intro-footer">
          <div className="intro-dots">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`intro-dot ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`}
                onClick={() => setStep(i)}
              />
            ))}
          </div>

          <div className="intro-buttons">
            {step > 0 && (
              <button className="intro-btn secondary" onClick={handlePrev}>
                {t('tutorial.back')}
              </button>
            )}
            <button className="intro-btn primary" onClick={handleNext}>
              {isLastStep ? t('tutorial.start') : t('tutorial.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IntroTutorial;
