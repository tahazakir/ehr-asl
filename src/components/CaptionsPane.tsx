import React, { useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { coalesceSegments } from '../lib/fusion';
import type { Segment } from '../types/core';

export default function CaptionsPane() {
  const segments = useAppStore((s) => s.segments);

  // Coalesce for display (keep raw in state for IDs/entities)
  const display = useMemo(() => coalesceSegments(segments, 300), [segments]);

  const asl = display.filter(
    (s) => s.speaker === 'patient' && s.modality === 'ASL'
  );
  const asr = display.filter(
    (s) => s.speaker === 'clinician' && s.modality === 'ASR'
  );

  const leftRef = useAutoScroll(asl.length);
  const rightRef = useAutoScroll(asr.length);

  return (
    <div style={wrap}>
      <Column
        title="Patient (ASL)"
        items={asl}
        innerRef={leftRef}
        getText={segmentText}
      />
      <Column
        title="Clinician (ASR)"
        items={asr}
        innerRef={rightRef}
        getText={(s) => s.text ?? ''}
      />
    </div>
  );
}

/* ---------- helpers ---------- */

function Column({
  title,
  items,
  innerRef,
  getText,
}: {
  title: string;
  items: Segment[];
  innerRef: React.RefObject<HTMLDivElement>;
  getText: (s: Segment) => string;
}) {
  return (
    <div style={col}>
      <div style={colHeader}>{title}</div>
      <div ref={innerRef} style={scroll}>
        {items.map((s) => (
          <div key={s.id} style={row}>
            <span style={time}>[{ts(s.tStart)}–{ts(s.tEnd)}]</span>
            <span style={text}>{getText(s)}</span>
            <span style={pill(s.confidence)}>{Math.round(s.confidence * 100)}%</span>
          </div>
        ))}
        {!items.length && <div style={{ opacity: 0.6, fontSize: 14 }}>No captions yet</div>}
      </div>
    </div>
  );
}

function segmentText(s: Segment) {
  return s.text ?? (s.glosses?.join(' ') ?? '');
}

function ts(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const msr = Math.floor(ms % 1000);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(msr).padStart(3,'0')}`;
}

function useAutoScroll(dep: number) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [dep]);
  return ref;
}

/* ---------- styles ---------- */

const wrap: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
  margin: '12px 0',
};

const col: React.CSSProperties = {
  border: '1px solid #333',
  borderRadius: 8,
  overflow: 'hidden',
  background: '#111',
};

const colHeader: React.CSSProperties = {
  padding: '8px 10px',
  fontWeight: 600,
  background: '#1a1a1a',
  borderBottom: '1px solid #333',
};

const scroll: React.CSSProperties = {
  maxHeight: 260,
  overflowY: 'auto',
  padding: 10,
  display: 'grid',
  gap: 8,
};

const row: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto 1fr auto',
  alignItems: 'baseline',
  gap: 8,
};

const time: React.CSSProperties = {
  opacity: 0.7,
  fontVariantNumeric: 'tabular-nums',
  fontSize: 13,
};

const text: React.CSSProperties = { fontSize: 16, lineHeight: 1.25 };

function pill(conf: number): React.CSSProperties {
  const weak = conf < 0.6;
  return {
    fontSize: 12,
    padding: '2px 6px',
    borderRadius: 12,
    border: `1px solid ${weak ? '#b15' : '#3a3'}`,
    color: weak ? '#f7a' : '#7f7',
    opacity: weak ? 0.9 : 0.9,
  };
}
