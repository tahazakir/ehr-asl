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
    <div style={{display:'flex', alignItems:'center', gap:8, marginTop:8}}>
      <button onClick={downloadJson}>Download JSON</button>
      <span style={{fontSize:12, opacity:0.7}}>Exports healthRecord + segments + entities</span>
    </div>
  );
}

function tsFileSafe(d: Date) {
  const pad = (n: number, w=2) => String(n).padStart(w,'0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
