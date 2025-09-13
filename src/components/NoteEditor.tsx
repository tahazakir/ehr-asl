import React from 'react';
import { useAppStore } from '../store/useAppStore';
import type { Entity, Note, Segment } from '../types/core';

export default function NoteEditor() {
  const note = useAppStore((s) => s.note);
  const entities = useAppStore((s) => s.entities);
  const segments = useAppStore((s) => s.segments);
  const setNote = useAppStore((s) => s.setNote);
  const addNoteSource = useAppStore((s) => s.addNoteSource);

  const onChange = (section: keyof Note['sections']) => 
    (e: React.ChangeEvent<HTMLTextAreaElement>) =>
      setNote({ ...note, sections: { ...note.sections, [section]: e.target.value } });

  const insertFromEntitiesToHPI = () => {
    if (!entities.length) return;

    const lines = buildHpiLines(entities, segments);
    if (!lines.length) return;

    const existing = note.sections.HPI?.trim();
    const sep = existing ? '\n' : '';
    const nextHPI = existing + sep + lines.join('\n');

    // Update note
    setNote({
      ...note,
      sections: { ...note.sections, HPI: nextHPI },
    });

    // Track sources
    for (const e of entities) {
      if (e.sourceSegmentId) {
        addNoteSource({ segmentId: e.sourceSegmentId, entityId: e.id });
      }
    }
  };

  return (
    <div style={wrap}>
      <div style={header}>
        <h2 style={{ margin: 0 }}>Note Editor (SOAP)</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={insertFromEntitiesToHPI}>
            Insert from Entities → HPI
          </button>
          {/* If Dev B adds negation flags later, add a similar button for ROS */}
        </div>
      </div>

      <Section
        label="HPI"
        value={note.sections.HPI}
        onChange={onChange('HPI')}
      />
      <Section
        label="ROS"
        value={note.sections.ROS}
        onChange={onChange('ROS')}
      />
      <Section
        label="PE"
        value={note.sections.PE}
        onChange={onChange('PE')}
      />
      <Section
        label="Plan"
        value={note.sections.Plan}
        onChange={onChange('Plan')}
      />

      <div style={{ fontSize: 12, opacity: 0.7 }}>
        Sources tracked: {note.sources.length}
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function Section({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <div style={section}>
      <div style={labelStyle}>{label}</div>
      <textarea
        value={value}
        onChange={onChange}
        rows={4}
        style={ta}
        placeholder={`Enter ${label}...`}
      />
    </div>
  );
}

// Heuristic HPI line builder: group entities by source segment,
// then compose short lines like “chest pain — left side, 2 days, severe”.
function buildHpiLines(ents: Entity[], segs: Segment[]): string[] {
  const bySeg = new Map<string, Entity[]>();
  for (const e of ents) {
    if (!e.sourceSegmentId) continue;
    if (!bySeg.has(e.sourceSegmentId)) bySeg.set(e.sourceSegmentId, []);
    bySeg.get(e.sourceSegmentId)!.push(e);
  }

  const lines: string[] = [];
  for (const [segId, group] of bySeg) {
    const t = pick(group, 'symptom').map(txt).join(', ');
    const body = pick(group, 'body_site').map(txt).join(', ');
    const dur = pick(group, 'duration').map(txt).join(', ');
    const sev = pick(group, 'severity').map(txt).join(', ');

    let line = '';
    if (t) line += t;
    if (body) line += (line ? ' — ' : '') + body;
    const tail = [dur, sev].filter(Boolean).join(', ');
    if (tail) line += (line ? ', ' : '') + tail;

    // fallback: just concatenate texts if nothing matched
    if (!line) line = group.map(txt).join(', ');

    // prefix time for quick provenance if available
    const s = segs.find((x) => x.id === segId);
    if (s) {
      const stamp = ts(s.tStart);
      line = `[${stamp}] ${line}`;
    }
    if (line.trim()) lines.push('• ' + line.trim());
  }
  return lines;
}

function pick(group: Entity[], type: Entity['type']) {
  return group.filter((e) => e.type === type);
}
function txt(e: Entity) {
  return e.text.trim();
}
function ts(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

/* ---------- styles ---------- */

const wrap: React.CSSProperties = { marginTop: 12, display: 'grid', gap: 10 };
const header: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};
const section: React.CSSProperties = {
  display: 'grid',
  gap: 6,
};
const labelStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 14,
  opacity: 0.9,
};
const ta: React.CSSProperties = {
  width: '100%',
  background: '#111',
  color: '#eee',
  border: '1px solid #333',
  borderRadius: 6,
  padding: 8,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  resize: 'vertical',
};
