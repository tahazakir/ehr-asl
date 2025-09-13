// src/components/ExportBar.tsx
import React from 'react';
import { useAppStore } from '../store/useAppStore';

export default function ExportBar() {
  const healthRecord = useAppStore(s => s.healthRecord);
  const segments = useAppStore(s => s.segments);
  const entities = useAppStore(s => s.entities);
  const visit = useAppStore(s => s.visit);

  const downloadJson = () => {
    const payload = {
      healthRecord,
      segments,
      entities,
      visitStartedAt: visit.startedAt ?? null,
      generatedAt: new Date().toISOString(),
      app: { name: 'ehr-asl', version: '0.2.0-simple' },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ehr_asl_export_${tsFileSafe(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <nav aria-label="Export" className="grid" style={{ alignItems: 'center', gridTemplateColumns: 'auto 1fr', gap: '0.5rem' }}>
      <div role="group">
        <button onClick={downloadJson}>Download JSON</button>
      </div>
      <small className="secondary">Exports health record, segments, and entities</small>
    </nav>
  );
}

function tsFileSafe(d: Date) {
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
