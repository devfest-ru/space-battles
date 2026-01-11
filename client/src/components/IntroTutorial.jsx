import React, { useState } from 'react';

function IntroTutorial({ onClose }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Space Battles",
      icon: "🚀",
      content: (
        <>
          <p className="intro-highlight">
            Program AI algorithms to command your space fleet in epic battles!
          </p>
          <div className="intro-features">
            <div className="intro-feature">
              <span className="feature-icon">🤖</span>
              <span>Write JavaScript code to control your ships</span>
            </div>
            <div className="intro-feature">
              <span className="feature-icon">🎯</span>
              <span>Aim, shoot, dodge, and outmaneuver opponents</span>
            </div>
            <div className="intro-feature">
              <span className="feature-icon">🏆</span>
              <span>Compete against other players in tournaments</span>
            </div>
          </div>
        </>
      )
    },
    {
      title: "Your Ship's API",
      icon: "📡",
      content: (
        <>
          <p className="intro-highlight">
            Each ship provides sensor data and accepts commands every frame.
          </p>
          <div className="intro-code-block">
            <div className="code-section-title">📥 Ship Sensors (Input)</div>
            <pre>{`ship.x, ship.y      // Position
ship.bodyAngle      // Direction (degrees)
ship.health         // Remaining health (1-3)
ship.canShoot       // Ready to fire?`}</pre>
          </div>
          <div className="intro-code-block">
            <div className="code-section-title">📤 Ship Commands (Output)</div>
            <pre>{`return {
  rotate: 1 / -1,   // Turn right / left
  boost: 1,         // Extra speed
  shoot: true       // Fire rocket!
}`}</pre>
          </div>
        </>
      )
    },
    {
      title: "🎮 Simulator Mode",
      icon: "🔬",
      content: (
        <>
          <p className="intro-highlight">
            Test and refine your algorithms in a safe environment.
          </p>
          <div className="intro-steps">
            <div className="intro-step">
              <span className="step-num">1</span>
              <span>Write your AI code in the <strong>Fleet Alpha</strong> editor</span>
            </div>
            <div className="intro-step">
              <span className="step-num">2</span>
              <span>Set up an opponent in <strong>Fleet Omega</strong> (or use sample code)</span>
            </div>
            <div className="intro-step">
              <span className="step-num">3</span>
              <span>Click <strong>▶ Start Battle</strong> and watch them fight!</span>
            </div>
            <div className="intro-step">
              <span className="step-num">4</span>
              <span>Use <strong>Mission Log</strong> to analyze and debug</span>
            </div>
          </div>
        </>
      )
    },
    {
      title: "🏆 Championship Mode",
      icon: "⚔️",
      content: (
        <>
          <p className="intro-highlight">
            Compete against real players in tournament brackets!
          </p>
          <div className="intro-steps">
            <div className="intro-step">
              <span className="step-num">1</span>
              <span><strong>Enter Arena</strong> — Register with your name</span>
            </div>
            <div className="intro-step">
              <span className="step-num">2</span>
              <span><strong>Upload Code</strong> — Submit your battle algorithm</span>
            </div>
            <div className="intro-step">
              <span className="step-num">3</span>
              <span><strong>Wait for Tournament</strong> — Battles run automatically</span>
            </div>
            <div className="intro-step">
              <span className="step-num">4</span>
              <span><strong>Watch Replays</strong> — Learn from victories and defeats</span>
            </div>
          </div>
          <p className="intro-tip">
            💡 Tip: Test your code in Simulator before entering Championship!
          </p>
        </>
      )
    },
    {
      title: "Battle Tips",
      icon: "💡",
      content: (
        <>
          <p className="intro-highlight">
            Master these concepts to dominate the battlefield!
          </p>
          <div className="intro-tips-grid">
            <div className="tip-card">
              <span className="tip-icon">🎯</span>
              <strong>Lead Your Target</strong>
              <span>Aim where enemies will be, not where they are</span>
            </div>
            <div className="tip-card">
              <span className="tip-icon">🔄</span>
              <strong>Keep Moving</strong>
              <span>Ships always move forward — use rotation to dodge</span>
            </div>
            <div className="tip-card">
              <span className="tip-icon">❤️</span>
              <strong>Health Matters</strong>
              <span>Damaged ships rotate and reload slower</span>
            </div>
            <div className="tip-card">
              <span className="tip-icon">🎪</span>
              <strong>Focus Fire</strong>
              <span>Concentrate attacks on one enemy at a time</span>
            </div>
          </div>
        </>
      )
    }
  ];

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      setStep(s => s + 1);
    }
  };

  const handlePrev = () => {
    setStep(s => Math.max(0, s - 1));
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="intro-overlay">
      <div className="intro-modal">
        <button className="intro-skip" onClick={handleSkip}>
          Skip Tutorial
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
                ← Back
              </button>
            )}
            <button className="intro-btn primary" onClick={handleNext}>
              {isLastStep ? "Start Playing! 🚀" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IntroTutorial;

