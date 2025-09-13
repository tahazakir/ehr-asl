export type Speaker = 'patient' | 'clinician';
export type Modality = 'ASL' | 'ASR';

export interface Segment {
  id: string;
  speaker: Speaker;
  modality: Modality;
  tStart: number; // ms since visit start
  tEnd: number;   // ms since visit start
  text?: string;
  glosses?: string[];
  confidence: number; // 0..1
  provenance?: any;
}

export type EntityType =
  | 'symptom'
  | 'duration'
  | 'severity'
  | 'body_site'
  | 'medication'
  | 'allergy';

export interface Entity {
  id: string;
  type: EntityType;
  text: string;
  code?: string;
  sourceSegmentId: string;
}

export interface Note {
  sections: { HPI: string; ROS: string; PE: string; Plan: string };
  sources: Array<{ segmentId: string; entityId?: string }>;
}

export type VisitStatus = 'idle' | 'recording' | 'review';

export interface VisitState {
  status: VisitStatus;
  startedAt?: number;
}
    