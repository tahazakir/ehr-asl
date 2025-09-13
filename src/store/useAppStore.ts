import { create } from 'zustand';
import type { Segment, Entity, VisitState, HealthRecord } from '../types/core';

type AppState = {
  visit: VisitState;
  segments: Segment[];
  entities: Entity[];
  healthRecord: HealthRecord;

  startVisit: () => void;
  stopVisit: () => void;
  resetVisit: () => void;

  addSegment: (seg: Segment) => void;
  addEntities: (list: Entity[]) => void;

  setHealthRecord: (text: string) => void;
  appendHealthRecord: (text: string) => void;
};

export const useAppStore = create<AppState>((set, get) => ({
  visit: { status: 'idle' },
  segments: [],
  entities: [],
  healthRecord: '',

  startVisit: () =>
    set(() => ({
      visit: { status: 'recording', startedAt: Date.now() },
      segments: [],
      entities: [],
      healthRecord: '',
    })),

  stopVisit: () => set((s) => ({ visit: { ...s.visit, status: 'review' } })),

  resetVisit: () =>
    set(() => ({
      visit: { status: 'idle' },
      segments: [],
      entities: [],
      healthRecord: '',
    })),

  addSegment: (seg) =>
    set((s) => {
      if (s.segments.some((x) => x.id === seg.id)) return s;
      const segments = [...s.segments, seg].sort((a, b) => a.tStart - b.tStart);
      return { ...s, segments };
    }),

  addEntities: (list) =>
    set((s) => {
      const seen = new Set(s.entities.map((e) => e.id));
      const merged = [...s.entities, ...list.filter((e) => !seen.has(e.id))];
      return { ...s, entities: merged };
    }),

  setHealthRecord: (text) => set(() => ({ healthRecord: text })),
  appendHealthRecord: (text) =>
    set((s) => ({ healthRecord: (s.healthRecord ? s.healthRecord + '\n' : '') + text })),
}));
