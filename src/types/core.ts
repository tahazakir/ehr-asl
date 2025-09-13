export type Speaker = 'patient' | 'clinician';
export type Modality = 'ASL' | 'ASR';

export interface Segment {
  id: string;
  speaker: Speaker;
  modality: Modality;
  tStart: number;
  tEnd: number;
  text?: string;
  glosses?: string[];
  confidence: number;
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

/** Single freeform field replacing SOAP sections */
export type HealthRecord = string;

export type VisitStatus = 'idle' | 'recording' | 'review';
export interface VisitState { status: VisitStatus; startedAt?: number; }
