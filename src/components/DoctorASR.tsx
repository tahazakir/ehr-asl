// src/components/DoctorASR.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { Segment } from '../types/core';

type RecStatus = 'idle' | 'listening' | 'error';

export default function DoctorASR() {
  const visit = useAppStore((s) => s.visit);
  const addSegment = useAppStore((s) => s.addSegment);

  const recRef = useRef<any>(null);
  const [status, setStatus] = useState<RecStatus>('idle');
  const [interim, setInterim] = useState('');
  const [lastFinal, setLastFinal] = useState('');

  // Track the current chunk (one utterance)
  const chunkTextRef = useRef<string>('');
  const chunkConfsRef = useRef<number[]>([]);
  const chunkStartAbsRef = useRef<number>(0); // Date.now() when chunk starts

  // Helper for relative ms since visit start
  const rel = (absMs: number) => {
    const started = visit.startedAt ?? Date.now();
    return Math.max(0, absMs - started);
  };

  // Web Speech API (Chrome)
  const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const startASR = () => {
    if (!Recognition) {
      setStatus('error');
      alert('Web Speech API not supported in this browser. Use Chrome on HTTPS/localhost.');
      return;
    }
    if (visit.status !== 'recording') {
      alert('Click Start (visit) first.');
      return;
    }

    const rec = new Recognition();
    recRef.current = rec;
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    const beginChunk = () => {
      chunkTextRef.current = '';
      chunkConfsRef.current = [];
      chunkStartAbsRef.current = Date.now();
    };

    rec.onstart = () => {
      setStatus('listening');
      beginChunk();
    };

    rec.onresult = (ev: any) => {
      let interimStr = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        const alt = res[0];
        if (res.isFinal) {
          chunkTextRef.current += (chunkTextRef.current ? ' ' : '') + alt.transcript.trim();
          if (typeof alt.confidence === 'number') chunkConfsRef.current.push(alt.confidence);
          setInterim('');
          setLastFinal(chunkTextRef.current);
        } else {
          interimStr += alt.transcript;
        }
      }
      setInterim(interimStr.trim());
    };

    rec.onerror = (e: any) => {
      console.warn('ASR error', e);
      if (status !== 'error') setStatus('idle');
    };

    rec.onend = () => {
      // Emit a Segment if we captured any final text
      const text = chunkTextRef.current.trim();
      if (text) {
        const nowAbs = Date.now();
        const tStart = rel(chunkStartAbsRef.current);
        const tEnd = rel(nowAbs);
        const confs = chunkConfsRef.current;
        const confidence = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : 0.85;

        const seg: Segment = {
          id: uid('asr'),
          speaker: 'clinician',
          modality: 'ASR',
          tStart,
          tEnd,
          text,
          confidence,
        };
        addSegment(seg);
      }

      // Keep listening while visit is recording
      if (status === 'listening' && visit.status === 'recording') {
        try {
          rec.start();
        } catch {
          setTimeout(() => {
            try { rec.start(); } catch {}
          }, 150);
        }
      } else {
        setStatus('idle');
      }
    };

    try {
      rec.start();
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  const stopASR = () => {
    const rec = recRef.current;
    if (rec) {
      try { rec.stop(); } catch {}
    }
    setStatus('idle');
    setInterim('');
  };

  // Auto-stop when the visit leaves recording state
  useEffect(() => {
    if (visit.status !== 'recording' && status === 'listening') {
      stopASR();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visit.status]);

  return (
    <article aria-labelledby="asr-heading" className="contrast">
      <header>
        <h3 id="asr-heading">Doctor ASR</h3>
        <p className="secondary">
          Status: <StatusBadge status={status} />
        </p>
      </header>

      <nav aria-label="ASR controls" className="grid">
        <div role="group">
          {status !== 'listening' ? (
            <button onClick={startASR} disabled={visit.status !== 'recording'}>
              Enable Mic
            </button>
          ) : (
            <button className="secondary" onClick={stopASR}>
              Stop Mic
            </button>
          )}
        </div>
      </nav>

      <section className="grid" style={{ gap: '0.25rem' }}>
        <div>
          <small className="secondary">Interim:</small>{' '}
          {interim || <i>…</i>}
        </div>
        <div>
          <small className="secondary">Last final:</small>{' '}
          {lastFinal || <i>—</i>}
        </div>
      </section>
    </article>
  );
}

/* --------- helpers --------- */

function uid(prefix = 'id') {
  const rnd =
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? (crypto as any).randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}_${Date.now()}_${rnd}`;
}

function StatusBadge({ status }: { status: RecStatus }) {
  const color =
    status === 'listening' ? '#2ecc71' :
    status === 'error' ? '#e74c3c' : '#7f8c8d';
  return (
    <span
      style={{
        fontSize: 12,
        padding: '2px 6px',
        borderRadius: 10,
        border: `1px solid ${color}`,
        color,
      }}
    >
      {status}
    </span>
  );
}
