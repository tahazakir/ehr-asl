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
    <>
      <header>
        <hgroup>
          <h1>Vital Signs (Demo)</h1>
          <p className="secondary">Assistive triage UI</p>
        </hgroup>
      </header>

      {/* Visit state + controls */}
      <section aria-label="Visit">
        <VisitControls />
      </section>

      {/* Main work area: 2-column responsive layout */}
      <section aria-label="Capture & Notes" className="grid">
        {/* Left column: vision + captions */}
        <article>
          <GestureASL />
          <CaptionsPane />
        </article>

        {/* Right column: ASR + health record */}
        <aside>
          <DoctorASR />
          <HealthRecordEditor />
        </aside>
      </section>

      {/* Export / actions */}
      <footer>
        <ExportBar />
      </footer>
    </>
  );
}
