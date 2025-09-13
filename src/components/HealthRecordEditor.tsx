// src/components/HealthRecordEditor.tsx
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
    <article aria-labelledby="record-heading" className="contrast">
      <header className="grid" style={{ gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
        <h3 id="record-heading" style={{ margin: 0 }}>Health Record</h3>
        <nav aria-label="Record actions">
          <div role="group">
            <button onClick={appendFromEntities}>Append from Entities</button>
          </div>
        </nav>
      </header>

      <section>
        <textarea
          value={healthRecord}
          onChange={(e) => setHealthRecord(e.target.value)}
          rows={8}
          placeholder="Write or paste notes here..."
          style={{
            width: '100%',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            resize: 'vertical',
          }}
        />
      </section>
    </article>
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
