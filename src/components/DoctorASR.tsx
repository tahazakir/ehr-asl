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

  const Recognition = (window.SpeechRecognition || window.webkitSpeechRecognition) as any;

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
    rec.continuous = true;       // keep listening across pauses
    rec.interimResults = true;   // show interim while speaking
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
          setInterim(''); // clear interim when a final comes in
          setLastFinal(chunkTextRef.current);
        } else {
          interimStr += alt.transcript;
        }
      }
      setInterim(interimStr.trim());
    };

    rec.onerror = (e: any) => {
      console.warn('ASR error', e);
      // Network/no-speech errors are common; try to keep loop alive
      if (status !== 'error') setStatus('idle');
    };

    rec.onend = () => {
      // If we captured any final text during this chunk, emit a Segment
      const text = chunkTextRef.current.trim();
      if (text) {
        const nowAbs = Date.now();
        const tStart = rel(chunkStartAbsRef.current);
        const tEnd = rel(nowAbs);
        const confs = chunkConfsRef.current;
        const confidence =
          confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : 0.85;

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

      // Keep the recognition loop running while visit is recording and we’re “listening”
      if (status === 'listening' && visit.status === 'recording') {
        try {
          rec.start();
        } catch {
          // starting too quickly can throw; small backoff
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
    <div style={wrap}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <strong>Doctor ASR</strong>
        <StatusBadge status={status} />
        {status !== 'listening' ? (
          <button onClick={startASR} disabled={visit.status !== 'recording'}>
            Enable Mic
          </button>
        ) : (
          <button onClick={stopASR}>Stop Mic</button>
        )}
      </div>
      <div style={mini}>
        <div><span style={label}>Interim:</span> {interim || <i>…</i>}</div>
        <div><span style={label}>Last final:</span> {lastFinal || <i>—</i>}</div>
      </div>
    </div>
  );
}

/* --------- helpers --------- */

function uid(prefix = 'id') {
  // favor stable-ish IDs without collisions for demo
  const rnd = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? (crypto as any).randomUUID()
    : Math.random().toString(36).slice(2);
  return `${prefix}_${Date.now()}_${rnd}`;
}

function StatusBadge({ status }: { status: RecStatus }) {
  const color =
    status === 'listening' ? '#2ecc71' :
    status === 'error' ? '#e74c3c' : '#7f8c8d';
  return (
    <span style={{
      fontSize: 12,
      padding: '2px 6px',
      borderRadius: 10,
      border: `1px solid ${color}`,
      color,
    }}>
      {status}
    </span>
  );
}

/* --------- styles --------- */
const wrap: React.CSSProperties = {
  marginTop: 8,
  padding: 8,
  border: '1px dashed #333',
  borderRadius: 8,
  background: '#0f0f0f',
};
const mini: React.CSSProperties = {
  marginTop: 6,
  fontSize: 13,
  display: 'grid',
  gap: 4,
};
const label: React.CSSProperties = { opacity: 0.7 };
