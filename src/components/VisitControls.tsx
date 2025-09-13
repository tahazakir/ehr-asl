import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import ConsentModal from './ConsentModal';

export default function VisitControls() {
  const visit = useAppStore((s) => s.visit);
  const startVisit = useAppStore((s) => s.startVisit);
  const stopVisit = useAppStore((s) => s.stopVisit);
  const resetVisit = useAppStore((s) => s.resetVisit);

  const [showConsent, setShowConsent] = useState(false);

  const handleStart = () => {
    if (visit.status === 'idle') setShowConsent(true);
  };
  const acceptConsent = () => {
    setShowConsent(false);
    startVisit();
  };

  return (
    <section aria-labelledby="visit-controls-heading">

      {/* Banner / Notice */}
      <aside className="contrast" role="note">
        Interpreter still required • Demo only
      </aside>

      {/* Status + Buttons */}
      <nav aria-label="Visit controls" className="grid">
        <div>
          <small>Status:&nbsp;</small>
          <strong>{visit.status}</strong>
        </div>

        <div role="group">
          <button onClick={handleStart} disabled={visit.status === 'recording'}>
            Start
          </button>
          <button className="secondary" onClick={stopVisit} disabled={visit.status !== 'recording'}>
            Stop
          </button>
          <button className="outline" onClick={resetVisit}>
            Reset
          </button>
        </div>
      </nav>

      <ConsentModal
        open={showConsent}
        onAccept={acceptConsent}
        onCancel={() => setShowConsent(false)}
      />
    </section>
  );
}
