import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import type { Segment, Entity } from './types/core';
import VisitControls from './components/VisitControls';
import DoctorASR from './components/DoctorASR';
import GestureASL from './components/GestureASL';
import CaptionsPane from './components/CaptionsPane';
import HealthRecordEditor from './components/HealthRecordEditor';
import ExportBar from './components/ExportBar';

export default function App() {
  const addSegment = useAppStore(s => s.addSegment);
  const addEntities = useAppStore(s => s.addEntities);

  useEffect(() => {
    (window as any).ADD_SEGMENT = (segment: Segment) => addSegment(segment);
    (window as any).ADD_ENTITIES = (ents: Entity[]) => addEntities(ents);
  }, [addSegment, addEntities]);

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui' }}>
      <h1>Vital Signs (Demo)</h1>
      <VisitControls />
      <DoctorASR />
      <GestureASL />
      <CaptionsPane />
      <HealthRecordEditor />
      <ExportBar />
    </div>
  );
}
