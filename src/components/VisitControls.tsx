import React, { useState } from 'react';
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
    <div style={wrap}>
      <div style={banner}>
        Interpreter still required • Demo only
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>Status:&nbsp;<strong>{visit.status}</strong></span>
        <button onClick={handleStart} disabled={visit.status === 'recording'}>Start</button>
        <button onClick={stopVisit} disabled={visit.status !== 'recording'}>Stop</button>
        <button onClick={resetVisit}>Reset</button>
      </div>

      <ConsentModal
        open={showConsent}
        onAccept={acceptConsent}
        onCancel={() => setShowConsent(false)}
      />
    </div>
  );
}

const wrap: React.CSSProperties = { marginBottom: 12, display: 'grid', gap: 8 };
const banner: React.CSSProperties = {
  padding: 8,
  background: '#222',
  color: '#fff',
  borderLeft: '4px solid #f5c518',
  borderRadius: 4,
  fontSize: 14,
};
