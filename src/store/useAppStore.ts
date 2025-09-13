import { create } from 'zustand';
import type { Segment, Entity, Note, VisitState } from '../types/core';

type AppState = {
  visit: VisitState;
  segments: Segment[];
  entities: Entity[];
  note: Note;

  startVisit: () => void;
  stopVisit: () => void;
  resetVisit: () => void;

  addSegment: (seg: Segment) => void;
  addEntities: (list: Entity[]) => void;

  setNote: (note: Note) => void;
  addNoteSource: (src: { segmentId: string; entityId?: string }) => void;
};

const emptyNote: Note = {
  sections: { HPI: '', ROS: '', PE: '', Plan: '' },
  sources: [],
};

export const useAppStore = create<AppState>((set, get) => ({
  visit: { status: 'idle' },
  segments: [],
  entities: [],
  note: emptyNote,

  startVisit: () =>
    set(() => ({
      visit: { status: 'recording', startedAt: Date.now() },
      segments: [],
      entities: [],
      note: emptyNote,
    })),

  stopVisit: () =>
    set((state) => ({
      visit: { ...state.visit, status: 'review' },
    })),

  resetVisit: () =>
    set(() => ({
      visit: { status: 'idle' },
      segments: [],
      entities: [],
      note: emptyNote,
    })),

  addSegment: (seg) =>
    set((state) => {
      if (state.segments.some((s) => s.id === seg.id)) return state; // dedupe by id
      const segments = [...state.segments, seg].sort(
        (a, b) => a.tStart - b.tStart
      );
      return { ...state, segments };
    }),

  addEntities: (list) =>
    set((state) => {
      const existing = new Set(state.entities.map((e) => e.id));
      const merged = [
        ...state.entities,
        ...list.filter((e) => !existing.has(e.id)),
      ];
      return { ...state, entities: merged };
    }),

  setNote: (note) => set(() => ({ note })),

  addNoteSource: (src) =>
    set((state) => ({
      note: { ...state.note, sources: [...state.note.sources, src] },
    })),
}));
