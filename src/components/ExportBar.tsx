import React from 'react';
import { useAppStore } from '../store/useAppStore';

export default function ExportBar() {
  const note = useAppStore(s => s.note);
  const segments = useAppStore(s => s.segments);
  const entities = useAppStore(s => s.entities);
  const visit = useAppStore(s => s.visit);

  const downloadJson = () => {
    const payload = {
      note,
      segments,
      entities,
      visitStartedAt: visit.startedAt ?? null,
      generatedAt: new Date().toISOString(),
      app: { name: 'ehr-asl', version: '0.1.0' },
    };
    const pretty = JSON.stringify(payload, null, 2);
    const blob = new Blob([pretty], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `note_export_${tsFileSafe(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={wrap}>
      <button onClick={downloadJson}>Download JSON</button>
      <span style={hint}>
        Exports note + entities + segments (with stable IDs)
      </span>
    </div>
  );
}

const wrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginTop: 8,
};
const hint: React.CSSProperties = { fontSize: 12, opacity: 0.7 };

function tsFileSafe(d: Date) {
  const pad = (n: number, w=2) => String(n).padStart(w,'0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
