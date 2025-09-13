import React from 'react';

type Props = {
  open: boolean;
  onAccept: () => void;
  onCancel: () => void;
};

export default function ConsentModal({ open, onAccept, onCancel }: Props) {
  if (!open) return null;
  return (
    <div style={overlay}>
      <div style={card}>
        <h2 style={{ marginTop: 0 }}>Before we start</h2>
        <p>
          This is a demo for documentation assistance only; do not use for medical
          decision-making. <strong>Qualified interpreters are still required</strong>.
          No PHI is stored.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel}>Cancel</button>
          <button onClick={onAccept}>I understand</button>
        </div>
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};
const card: React.CSSProperties = {
  background: '#111',
  color: '#fff',
  padding: 16,
  borderRadius: 8,
  maxWidth: 520,
  width: '90%',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
};
