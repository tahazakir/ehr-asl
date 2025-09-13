import React, { useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { coalesceSegments } from '../lib/fusion';
import type { Segment } from '../types/core';

export default function CaptionsPane() {
  const segments = useAppStore((s) => s.segments);

  const display = useMemo(() => coalesceSegments(segments, 300), [segments]);

  const asl = display.filter((s) => s.speaker === 'patient' && s.modality === 'ASL');
  const asr = display.filter((s) => s.speaker === 'clinician' && s.modality === 'ASR');

  const leftRef = useAutoScroll(asl.length);
  const rightRef = useAutoScroll(asr.length);

  return (
    <section
      aria-label="Captions"
      className="grid"
      style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }} // ensure wide enough columns
    >
      <Column title="Patient (ASL)" items={asl} innerRef={leftRef} getText={segmentText} />
      <Column title="Clinician (ASR)" items={asr} innerRef={rightRef} getText={(s) => s.text ?? ''} />
    </section>
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
  innerRef: React.MutableRefObject<HTMLDivElement | null>;
  getText: (s: Segment) => string;
}) {
  return (
    <article className="contrast">
      <header>
        <h3>{title}</h3>
      </header>

      {/* Scroll container */}
      <div
        ref={innerRef}
        style={{
          maxHeight: 260,
          overflowY: 'auto',
          padding: '0.5rem',
          width: '100%',
        }}
      >
        <ul role="list" style={{ margin: 0, padding: 0, display: 'grid', gap: '0.6rem', width: '100%' }}>
          {items.map((s) => (
            <li key={s.id} style={{ listStyle: 'none', width: '100%' }}>
              {/* Row as a vertical stack: meta line (timestamp + conf) then full-width text */}
              <div style={{ display: 'block', width: '100%' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    width: '100%',
                  }}
                >
                  <small style={{ opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>
                    [{ts(s.tStart)}–{ts(s.tEnd)}]
                  </small>
                  <span style={pill(s.confidence)}>{Math.round(s.confidence * 100)}%</span>
                </div>

                <p
                  style={{
                    margin: '0.25rem 0 0',
                    lineHeight: 1.35,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',   // break only when needed
                    overflowWrap: 'break-word',
                  }}
                >
                  {getText(s)}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {!items.length && <p className="secondary" style={{ margin: 0 }}>No captions yet</p>}
      </div>
    </article>
  );
}

function segmentText(s: Segment) {
  return s.text ?? (s.glosses?.join(' ') ?? '');
}

function ts(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const msr = Math.floor(ms % 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(msr).padStart(3, '0')}`;
}

function useAutoScroll(dep: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [dep]);
  return ref;
}

function pill(conf: number): React.CSSProperties {
  const weak = conf < 0.6;
  return {
    fontSize: 12,
    padding: '2px 6px',
    borderRadius: 12,
    border: `1px solid ${weak ? '#b15' : '#3a3'}`,
    color: weak ? '#f7a' : '#7f7',
    whiteSpace: 'nowrap',
  };
}
