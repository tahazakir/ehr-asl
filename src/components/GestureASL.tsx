// src/components/GestureASL.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { Segment } from '../types/core';
import { GestureRecognizer, FilesetResolver, DrawingUtils, type GestureRecognizerResult } from '@mediapipe/tasks-vision';

export default function GestureASL() {
  const visit = useAppStore((s) => s.visit);
  const addSegment = useAppStore((s) => s.addSegment);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream|null>(null);
  const recRef = useRef<GestureRecognizer|null>(null);
  const drawingRef = useRef<DrawingUtils|null>(null);
  const rafRef = useRef<number|undefined>(undefined);

  const [status, setStatus] = useState<'idle'|'loading'|'ready'|'running'|'error'>('idle');
  const [lastGesture, setLastGesture] = useState<string>('—');

  // Simple demo mapping: gesture name -> phrase (text + glosses)
  const GESTURE_TO_PHRASE: Record<string, {text: string; glosses: string[]}> = {
    // For demo: map Thumb_Up to "chest pain"
    Thumb_Down: { text: 'chest pain', glosses: ['chest','pain'] },
    // Add more if you like:
    Open_Palm: { text: 'left side', glosses: ['left','side'] },
    Pointing_Up: { text: 'two days', glosses: ['two','days'] },
  };
  const SCORE_MIN = 0.80;      // min score to accept a gesture
  const STABLE_MS = 600;       // must stay the same gesture for this long
  const COOLDOWN_MS = 1500;    // throttle repeated emits

  // Stability tracking
  const stableNameRef = useRef<string | null>(null);
  const stableSinceRef = useRef<number>(0);
  const lastEmitAtRef = useRef<number>(0);

  // ms since visit start
  const rel = (abs: number) => Math.max(0, abs - (visit.startedAt ?? Date.now()));

  async function ensureRecognizer() {
    if (recRef.current) return;
    setStatus('loading');
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      const recognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
        },
        runningMode: 'VIDEO',
        numHands: 1,
      });
      recRef.current = recognizer;
      setStatus('ready');
    } catch (e) {
      console.error(e);
      setStatus('error');
      alert('Failed to load MediaPipe Gesture Recognizer. Check network/HTTPS.');
    }
  }

  async function startCamera() {
    if (streamRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' },
      audio: false,
    });
    streamRef.current = stream;
    const v = videoRef.current!;
    v.srcObject = stream;
    await v.play();

    const c = canvasRef.current!;
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    drawingRef.current = new DrawingUtils(c.getContext('2d')!);
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  function topGestureName(r: GestureRecognizerResult): {name: string|null, score: number} {
    if (!r.gestures || !r.gestures.length) return { name: null, score: 0 };
    // r.gestures is an array per-hand; each entry is sorted by score
    let best: {name: string; score: number} | null = null;
    for (const candidates of r.gestures) {
      if (!candidates?.length) continue;
      const g = candidates[0];
      if (!best || g.score > best.score) best = { name: g.categoryName, score: g.score };
    }
    return best ?? { name: null, score: 0 };
  }

  function maybeEmit(name: string, score: number, nowAbs: number) {
    const mapping = GESTURE_TO_PHRASE[name];
    if (!mapping) return;

    // stability window
    const prev = stableNameRef.current;
    if (prev !== name) {
      stableNameRef.current = name;
      stableSinceRef.current = nowAbs;
      return;
    }
    const stableMs = nowAbs - stableSinceRef.current;
    const sinceLast = nowAbs - lastEmitAtRef.current;
    if (stableMs < STABLE_MS || sinceLast < COOLDOWN_MS) return;

    // emit ASL segment mapped to phrase
    const seg: Segment = {
      id: uid('asl'),
      speaker: 'patient',
      modality: 'ASL',
      tStart: rel(stableSinceRef.current),
      tEnd: rel(nowAbs),
      text: mapping.text,
      glosses: mapping.glosses,
      confidence: score,
      provenance: { gesture: name, score, stableMs },
    };
    addSegment(seg);
    lastEmitAtRef.current = nowAbs;
  }

  function draw(r: GestureRecognizerResult) {
    const c = canvasRef.current!;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    const utils = drawingRef.current!;
    r.landmarks?.forEach((lm) => {
      utils.drawConnectors(lm, GestureRecognizer.HAND_CONNECTIONS, { lineWidth: 2 });
      utils.drawLandmarks(lm, { radius: 3 });
    });
  }

  function loop() {
    const rec = recRef.current;
    const v = videoRef.current;
    if (!rec || !v) return;
    const now = performance.now();
    const res = rec.recognizeForVideo(v, now);
    if (res) {
      draw(res);
      const { name, score } = topGestureName(res);
      if (name && score >= SCORE_MIN) {
        setLastGesture(`${name} (${score.toFixed(2)})`);
        maybeEmit(name, score, Date.now());
      } else {
        setLastGesture('—');
        stableNameRef.current = null; // break stability if nothing confident
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  async function start() {
    if (visit.status !== 'recording') {
      alert('Click Start (visit) first.');
      return;
    }
    await ensureRecognizer();
    await startCamera();
    if (status === 'ready' || recRef.current) {
      setStatus('running');
      rafRef.current = requestAnimationFrame(loop);
    }
  }

  function stop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    stopCamera();
    setStatus('ready');
  }

  useEffect(() => { ensureRecognizer(); }, []);
  useEffect(() => {
    if (visit.status !== 'recording' && status === 'running') stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visit.status]);

  useEffect(() => () => { stop(); }, []); // cleanup

  return (
    <div style={wrap}>
      <div style={{display:'flex', alignItems:'center', gap:8}}>
        <strong>Patient Gestures (MediaPipe)</strong>
        <Badge text={status}/>
        {status !== 'running' ? (
          <button onClick={start}>Start Gesture Capture</button>
        ) : (
          <button onClick={stop}>Stop Gesture Capture</button>
        )}
        <span style={{opacity:0.7, fontSize:13}}>Last: {lastGesture}</span>
      </div>

      <div style={{position:'relative', width:640, height:480, marginTop:8}}>
        <video ref={videoRef} playsInline muted style={videoStyle}/>
        <canvas ref={canvasRef} width={640} height={480} style={canvasStyle}/>
      </div>

      <small style={{opacity:0.7}}>
        Tip: hold a clear <b>Thumb_Up</b> for ~{STABLE_MS}ms to emit “chest pain”.
      </small>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return <span style={{fontSize:12, padding:'2px 6px', border:'1px solid #555', borderRadius:10}}>{text}</span>;
}
function uid(prefix='id') {
  const rnd = (crypto as any)?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}_${Date.now()}_${rnd}`;
}
const wrap: React.CSSProperties = { marginTop: 8, padding: 8, border: '1px dashed #333', borderRadius: 8, background: '#0f0f0f' };
const videoStyle: React.CSSProperties = { position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', borderRadius:8 };
const canvasStyle: React.CSSProperties = { position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' };
