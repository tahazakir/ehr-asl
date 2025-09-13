import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import type { Segment, Entity } from './types/core';
import { coalesceSegments } from './lib/fusion';
import VisitControls from './components/VisitControls';
import CaptionsPane from './components/CaptionsPane';
import NoteEditor from './components/NoteEditor';
import ExportBar from './components/ExportBar';
import DoctorASR from './components/DoctorASR';
import GestureASL from './components/GestureASL';


export default function App() {
  const addSegment = useAppStore((s) => s.addSegment);
  const addEntities = useAppStore((s) => s.addEntities);
  const segments = useAppStore((s) => s.segments);
  const entities = useAppStore((s) => s.entities);

  useEffect(() => {
    (window as any).ADD_SEGMENT = (segment: Segment) => addSegment(segment);
    (window as any).ADD_ENTITIES = (ents: Entity[]) => addEntities(ents);
  }, [addSegment, addEntities]);

  const display = coalesceSegments(segments, 300);

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui' }}>
      <h1>EHR-ASL Demo</h1>
      <VisitControls />
      <DoctorASR />
      <GestureASL />
      <CaptionsPane/>
      <NoteEditor />
      <ExportBar />

      <p>Segments: {segments.length} (display: {display.length}) | Entities: {entities.length}</p>
      <ul>
        {display.map(s => (
          <li key={s.id}>
            [{ts(s.tStart)}–{ts(s.tEnd)}] {s.speaker}/{s.modality}: {s.text ?? (s.glosses?.join(' ') ?? '')} ({Math.round(s.confidence*100)}%)
          </li>
        ))}
      </ul>
    </div>
  );
}

function ts(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const msr = Math.floor(ms % 1000);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(msr).padStart(3,'0')}`;
}
