// src/components/GestureASL.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { Segment, Entity } from '../types/core';
import { requestFollowup, loadPatientHistory, type Followup } from '../lib/llm';
import {
    GestureRecognizer,
    FaceDetector,
    FilesetResolver,
    DrawingUtils,
    type GestureRecognizerResult,
    type FaceDetectorResult, // use the public result type
} from '@mediapipe/tasks-vision';
import { loadVoices, pickVoice, speak } from '../lib/tts';

// Local cross-version-safe keypoint type (FaceDetector keypoints are normalized 0..1)
type MPKeypoint = { x: number; y: number; z?: number; score?: number; name?: string };

export default function GestureASL() {
    const visit = useAppStore((s) => s.visit);
    const addSegment = useAppStore((s) => s.addSegment);
    const addEntities = useAppStore((s) => s.addEntities);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recRef = useRef<GestureRecognizer | null>(null);
    const faceRef = useRef<FaceDetector | null>(null);
    const drawingRef = useRef<DrawingUtils | null>(null);
    const rafRef = useRef<number | undefined>(undefined);

    const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'running' | 'error'>('idle');
    const [lastGesture, setLastGesture] = useState<string>('—');

    const [ttsOn, setTtsOn] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [voice, setVoice] = useState<SpeechSynthesisVoice | undefined>(undefined);
    const [fup, setFup] = useState<Followup | null>(null);
    const [fupLoading, setFupLoading] = useState(false);
    const [fupError, setFupError] = useState<string | null>(null);


    useEffect(() => {
        loadVoices().then((vs) => {
            setVoices(vs);
            setVoice((prev) => prev ?? pickVoice(vs, 'en', 'Google'));
        });
    }, []);

    const GESTURE_TO_PHRASE: Record<string, { text: string; glosses: string[]; entityType: Entity['type'] }> = {
        Thumb_Down: { text: 'severe', glosses: ['severe', 'cough'], entityType: 'severity' },
        Thumb_Up: { text: 'severe', glosses: ['severe', 'cough'], entityType: 'symptom' },
        Closed_Fist: { text: 'cough', glosses: ['cough'], entityType: 'symptom' },
        Victory: { text: 'two days', glosses: ['two', 'days'], entityType: 'duration' },
        Pointing_Up: { text: 'allergy', glosses: ['allergy', 'cough'], entityType: 'symptom' },
        ALLERGY: { text: 'allergy', glosses: ['allergy'], entityType: 'symptom' },
    };

    const SCORE_MIN = 0.7;
    const REQUIRED_STREAK = 6;
    const STABLE_MS = 500;
    const COOLDOWN_MS = 1500;

    const ALLERGY_HOLD_MS = 300;
    const ALLERGY_PROX_FRAC = 0.12;
    const ALLERGY_DIR_COS = 0.6;

    const streakNameRef = useRef<string | null>(null);
    const streakCountRef = useRef<number>(0);
    const stableStartRef = useRef<number>(0);
    const lastEmitAtRef = useRef<number>(0);

    const allergyHoldMsRef = useRef<number>(0);
    const lastPerfTsRef = useRef<number>(performance.now());

    const rel = (abs: number) => Math.max(0, abs - (visit.startedAt ?? Date.now()));

    async function ensureRecognizer() {
        if (recRef.current && faceRef.current) {
            setStatus('ready');
            return;
        }
        setStatus('loading');
        try {
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
            );
            if (!recRef.current) {
                recRef.current = await GestureRecognizer.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath:
                            'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
                    },
                    runningMode: 'VIDEO',
                    numHands: 1,
                    cannedGesturesClassifierOptions: { scoreThreshold: SCORE_MIN },
                });
            }
            if (!faceRef.current) {
                faceRef.current = await FaceDetector.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath:
                            'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
                    },
                    runningMode: 'VIDEO',
                });
            }
            setStatus('ready');
        } catch (e) {
            console.error(e);
            setStatus('error');
            alert('Failed to load MediaPipe tasks. Check network/HTTPS.');
        }
    }

    async function startCamera() {
        if (streamRef.current) return;
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720, facingMode: 'user' },
            audio: false,
        });
        streamRef.current = stream;
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();

        const c = canvasRef.current!;
        c.width = v.videoWidth || 1280;
        c.height = v.videoHeight || 720;
        drawingRef.current = new DrawingUtils(c.getContext('2d')!);
    }

    function stopCamera() {
        const v = videoRef.current;
        if (v) {
            v.pause();
            const stream = v.srcObject as MediaStream | null;
            stream?.getTracks().forEach((t) => t.stop());
            v.srcObject = null;
        }
        streamRef.current = null;
    }

    function topGestureName(r: GestureRecognizerResult): { name: string | null; score: number } {
        if (!r.gestures || !r.gestures.length) return { name: null, score: 0 };
        let best: { name: string; score: number } | null = null;
        for (const candidates of r.gestures) {
            if (!candidates?.length) continue;
            const g = candidates[0];
            if (!best || g.score > best.score) best = { name: g.categoryName, score: g.score };
        }
        return best ?? { name: null, score: 0 };
    }

    async function emitFromMapping(name: string, nowAbs: number, score: number) {
        const mapping = GESTURE_TO_PHRASE[name];
        if (!mapping) return;

        const seg: Segment = {
            id: uid('asl'),
            speaker: 'patient',
            modality: 'ASL',
            tStart: rel(nowAbs),
            tEnd: rel(nowAbs),
            text: mapping.text,
            glosses: mapping.glosses,
            confidence: score,
            provenance: { gesture: name, score },
        };
        addSegment(seg);

        const ent: Entity = {
            id: uid('ent'),
            type: mapping.entityType,
            text: mapping.text,
            sourceSegmentId: seg.id,
        };
        addEntities([ent]);

        if (ttsOn) speak(mapping.text, { voice, rate: 1, pitch: 1 });
        lastEmitAtRef.current = nowAbs;

        // === Ask LLM for one follow-up when a SYMPTOM appears ===
        if (mapping.entityType === 'symptom') {
            try {
                setFupLoading(true);
                setFupError(null);
                const hist = await loadPatientHistory();
                const res = await requestFollowup(mapping.text, hist);
                if (res) setFup(res);
            } catch (e: any) {
                setFupError(e?.message || 'LLM error');
            } finally {
                setFupLoading(false);
            }
        }

    }

    function maybeEmit(nowAbs: number, name: string, score: number) {
        const mapping = GESTURE_TO_PHRASE[name];
        if (!mapping) return;

        const sinceStable = nowAbs - stableStartRef.current;
        const sinceLast = nowAbs - lastEmitAtRef.current;

        if (streakCountRef.current >= REQUIRED_STREAK && sinceStable >= STABLE_MS && sinceLast >= COOLDOWN_MS) {
            void emitFromMapping(name, nowAbs, score);
            streakCountRef.current = 0;
            streakNameRef.current = null;
        }
    }

    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
        Math.hypot(a.x - b.x, a.y - b.y);

    function draw(handRes: GestureRecognizerResult, faceRes?: FaceDetectorResult) {
        const c = canvasRef.current!;
        const ctx = c.getContext('2d')!;
        ctx.clearRect(0, 0, c.width, c.height);

        const utils = drawingRef.current!;
        // Hands
        handRes.landmarks?.forEach((lm) => {
            utils.drawConnectors(lm, GestureRecognizer.HAND_CONNECTIONS, { lineWidth: 2 });
            utils.drawLandmarks(lm, { radius: 3 });
        });

        // Face: box + 6 keypoints
        const det = faceRes?.detections?.[0];
        if (det) {
            ctx.save();
            ctx.strokeStyle = '#0ff';
            ctx.lineWidth = 2;
            const bb = det.boundingBox!;
            ctx.strokeRect(bb.originX, bb.originY, bb.width, bb.height);
            ctx.restore();

            const w = c.width, h = c.height;
            ctx.save();
            ctx.fillStyle = '#0ff';
            ((det.keypoints || []) as MPKeypoint[]).forEach((kp: MPKeypoint) => {
                ctx.beginPath();
                ctx.arc(kp.x * w, kp.y * h, 3, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
        }
    }

    function loop() {
        const rec = recRef.current;
        const face = faceRef.current;
        const v = videoRef.current;
        if (!rec || !face || !v) return;

        const nowPerf = performance.now();
        const handRes = rec.recognizeForVideo(v, nowPerf);
        const faceRes: FaceDetectorResult = face.detectForVideo(v, nowPerf);

        if (handRes) {
            draw(handRes, faceRes);

            const { name, score } = topGestureName(handRes);
            const nowAbs = Date.now();

            if (name && score >= SCORE_MIN) {
                setLastGesture(`${name} (${score.toFixed(2)})`);
                if (streakNameRef.current === name) streakCountRef.current += 1;
                else {
                    streakNameRef.current = name;
                    streakCountRef.current = 1;
                    stableStartRef.current = nowAbs;
                }
                maybeEmit(nowAbs, name, score);
            } else {
                if (!lastGesture.startsWith('ALLERGY')) setLastGesture('—');
                streakNameRef.current = null;
                streakCountRef.current = 0;
            }

            // Allergy fusion (hand + face)
            const hand = handRes.landmarks?.[0];
            const det = faceRes?.detections?.[0];
            const kp = (det?.keypoints || []) as MPKeypoint[];
            const nose = kp[2]; // [right_eye, left_eye, nose, mouth, right_tragion, left_tragion]
            const faceWn = det ? det.boundingBox!.width / (v.videoWidth || 1) : 1;

            if (hand && nose) {
                const tipIds = [8, 12, 16, 20, 4];
                const { id: closestId } = tipIds.reduce(
                    (best, id) => {
                        const d = Math.hypot(hand[id].x - nose.x, hand[id].y - nose.y);
                        return d < best.d ? { id, d } : best;
                    },
                    { id: 8, d: Infinity }
                );

                const tip = hand[8];
                const pip = hand[6];

                const close = dist(tip, nose) < ALLERGY_PROX_FRAC * faceWn;

                const vIndex = { x: tip.x - pip.x, y: tip.y - pip.y };
                const vNose = { x: nose.x - tip.x, y: nose.y - tip.y };
                const mag = (u: { x: number; y: number }) => Math.hypot(u.x, u.y) || 1;
                const cos = (vIndex.x * vNose.x + vIndex.y * vNose.y) / (mag(vIndex) * mag(vNose));
                const toward = cos > ALLERGY_DIR_COS;

                const dt = nowPerf - lastPerfTsRef.current;
                if (closestId === 8 && close && toward) allergyHoldMsRef.current += dt;
                else allergyHoldMsRef.current = 0;

                if (allergyHoldMsRef.current >= ALLERGY_HOLD_MS && nowAbs - lastEmitAtRef.current >= COOLDOWN_MS) {
                    setLastGesture('ALLERGY via nose-point');
                    emitFromMapping('ALLERGY', nowAbs, typeof score === 'number' ? score : 0.99);
                    allergyHoldMsRef.current = 0;
                }
            } else {
                allergyHoldMsRef.current = 0;
            }

            lastPerfTsRef.current = nowPerf;
        }

        rafRef.current = requestAnimationFrame(loop);
    }

    async function start() {
        if (visit.status !== 'recording') {
            alert('Click Start (visit) first.');
            return;
        }
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = undefined;
        }
        await ensureRecognizer();
        await startCamera();
        if ((status === 'ready' || (recRef.current && faceRef.current)) && videoRef.current) {
            setStatus('running');
            rafRef.current = requestAnimationFrame(loop);
        }
    }

    function stop() {
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = undefined;
        }
        const c = canvasRef.current;
        if (c) c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
        stopCamera();

        // keep tasks alive for quick restart (or close+null them if you prefer freeing memory)
        allergyHoldMsRef.current = 0;
        streakNameRef.current = null;
        streakCountRef.current = 0;
        setLastGesture('—');
        setStatus('ready');

        setFup(null);
        setFupError(null);
        setFupLoading(false);

    }

    useEffect(() => {
        ensureRecognizer();
    }, []);
    useEffect(() => {
        if (visit.status !== 'recording' && status === 'running') stop();
    }, [visit.status]);
    useEffect(() => () => void stop(), []);

    return (
        <div style={wrap}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong>Patient Gestures (MediaPipe)</strong>
                <Badge text={status} />
                {status !== 'running' ? (
                    <button onClick={start}>Start Gesture Capture</button>
                ) : (
                    <button onClick={stop}>Stop Gesture Capture</button>
                )}
                <span style={{ opacity: 0.7, fontSize: 13 }}>Last: {lastGesture}</span>

                <label style={{ marginLeft: 8, fontSize: 13 }}>
                    <input type="checkbox" checked={ttsOn} onChange={(e) => setTtsOn(e.target.checked)} /> Patient Voice
                </label>
                <select
                    disabled={!ttsOn}
                    value={voice?.voiceURI}
                    onChange={(e) => {
                        const v = voices.find((v) => v.voiceURI === e.target.value);
                        setVoice(v);
                        speak(' ', { voice: v, volume: 0 });
                    }}
                    style={{ fontSize: 12 }}
                >
                    {voices.map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                            {v.name} ({v.lang})
                        </option>
                    ))}
                </select>
            </div>

            <div style={{ position: 'relative', width: 640, height: 480, marginTop: 8 }}>
                <video ref={videoRef} playsInline muted style={videoStyle} />
                <canvas ref={canvasRef} width={640} height={480} style={canvasStyle} />
            </div>

            <small style={{ opacity: 0.7 }}>
                Hold a clear Thumb_Up/Thumb_Down ~0.5–0.8s to emit “chest pain”. Point your index fingertip to the nose for ~0.3s to emit “allergy”.
            </small>

            {(fupLoading || fup || fupError) && (
                <div style={{ marginTop: 8, padding: 8, border: '1px solid #333', borderRadius: 8 }}>
                    <strong>Suggested follow-up</strong>
                    {fupLoading && <div style={{ fontSize: 12, opacity: 0.8 }}>thinking…</div>}
                    {fup && (
                        <div style={{ marginTop: 6 }}>
                            <div>Q: {fup.question}</div>
                            <div style={{ fontSize: 12, opacity: 0.75 }}>Why: {fup.why}</div>
                            <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
                                <button onClick={() => speak(fup.question, { rate: 1 })}>🔊 Ask</button>
                                <button onClick={() => navigator.clipboard.writeText(fup.question)} style={{ fontSize: 12 }}>Copy</button>
                            </div>
                        </div>
                    )}
                    {fupError && <div style={{ color: '#f66' }}>{fupError}</div>}
                </div>
            )}

        </div>
    );
}

function Badge({ text }: { text: string }) {
    return (
        <span style={{ fontSize: 12, padding: '2px 6px', border: '1px solid #555', borderRadius: 10 }}>
            {text}
        </span>
    );
}
function uid(prefix = 'id') {
    const rnd = (crypto as any)?.randomUUID?.() ?? Math.random().toString(36).slice(2);
    return `${prefix}_${Date.now()}_${rnd}`;
}
const wrap: React.CSSProperties = {
    marginTop: 8,
    padding: 8,
    border: '1px dashed #333',
    borderRadius: 8,
    background: '#0f0f0f',
};
const videoStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: 8,
};
const canvasStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
};
