import type { Segment, Entity } from './core';

declare global {
  interface Window {
    ADD_SEGMENT: (segment: Segment) => void;
    ADD_ENTITIES: (entities: Entity[]) => void;
  }
}
export {};
