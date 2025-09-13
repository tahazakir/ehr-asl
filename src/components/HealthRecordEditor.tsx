import React from 'react';
import { useAppStore } from '../store/useAppStore';
import type { Entity, Segment } from '../types/core';

export default function HealthRecordEditor() {
  const healthRecord = useAppStore(s => s.healthRecord);
  const setHealthRecord = useAppStore(s => s.setHealthRecord);
  const appendHealthRecord = useAppStore(s => s.appendHealthRecord);
  const entities = useAppStore(s => s.entities);
  const segments = useAppStore(s => s.segments);

  // Optional helper: append concise bullets from current entities
  const appendFromEntities = () => {
    if (!entities.length) return;
    const lines = buildLines(entities, segments);
    if (!lines.length) return;
    appendHealthRecord(lines.join('\n'));
  };

  return (
    <div style={wrap}>
      <div style={row}>
        <h2 style={{margin:0}}>Health Record</h2>
        <div style={{display:'flex', gap:8}}>
          <button onClick={appendFromEntities}>Append from Entities</button>
        </div>
      </div>
      <textarea
        value={healthRecord}
        onChange={(e) => setHealthRecord(e.target.value)}
        rows={8}
        style={ta}
        placeholder="Write or paste notes here..."
      />
    </div>
  );
}

function buildLines(ents: Entity[], segs: Segment[]) {
  // Group by source segment and emit simple bullets with timestamp
  const bySeg = new Map<string, Entity[]>();
  for (const e of ents) {
    if (!e.sourceSegmentId) continue;
    if (!bySeg.has(e.sourceSegmentId)) bySeg.set(e.sourceSegmentId, []);
    bySeg.get(e.sourceSegmentId)!.push(e);
  }
  const toTxt = (e: Entity) => e.text.trim();
  const ts = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const out: string[] = [];
  for (const [segId, group] of bySeg) {
    const seg = segs.find(x => x.id === segId);
    const time = seg ? `[${ts(seg.tStart)}] ` : '';
    const line = '• ' + time + group.map(toTxt).join(', ');
    out.push(line);
  }
  return out;
}

const wrap: React.CSSProperties = { marginTop: 12, display: 'grid', gap: 8 };
const row: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
const ta: React.CSSProperties = {
  width: '100%', background:'#111', color:'#eee', border:'1px solid #333',
  borderRadius:6, padding:10, fontFamily:'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', resize:'vertical'
};
