import type { Segment } from '../types/core';

/** Non-mutating sort by tStart (ms) */
export function sortByStart(list: Segment[]): Segment[] {
  return [...list].sort((a, b) => a.tStart - b.tStart);
}

/**
 * Coalesce adjacent segments from the same speaker+modality
 * when the gap between them ≤ windowMs (default 300ms).
 * Returns a new array (does not mutate input).
 *
 * Use this for DISPLAY ONLY. Keep raw segments in state for IDs/entities.
 */
export function coalesceSegments(list: Segment[], windowMs = 300): Segment[] {
  const sorted = sortByStart(list);
  if (sorted.length <= 1) return sorted;

  const out: Segment[] = [];
  let cur: Segment | null = null;

  for (const seg of sorted) {
    if (
      cur &&
      seg.speaker === cur.speaker &&
      seg.modality === cur.modality &&
      seg.tStart - cur.tEnd <= windowMs
    ) {
      // merge into cur — build object explicitly (no spread of union types)
      const mergedText = concatText(cur.text, seg.text);
      const mergedGlosses = concatGlosses(cur.glosses, seg.glosses);

      const updated: Segment = {
        id: cur.id, // keep current ID for display stability
        speaker: cur.speaker,
        modality: cur.modality,
        tStart: cur.tStart,
        tEnd: Math.max(cur.tEnd, seg.tEnd),
        text: mergedText ?? undefined,
        glosses: mergedGlosses.length ? mergedGlosses : undefined,
        confidence: Math.min(cur.confidence, seg.confidence),
        provenance: cur.provenance,
      };

      cur = updated;
      out[out.length - 1] = cur;
    } else {
      cur = cloneSeg(seg);
      out.push(cur);
    }
  }

  return out;
}

/**
 * Optional: group into "turns" whenever the speaker changes
 * or there's a silent gap > gapMs (default 1500ms).
 */
export function labelTurns(
  list: Segment[],
  gapMs = 1500
): Array<{ turnId: number; segments: Segment[]; tStart: number; tEnd: number; speaker?: Segment['speaker'] }> {
  const segments = sortByStart(list);
  const groups: Array<{ turnId: number; segments: Segment[]; tStart: number; tEnd: number; speaker?: Segment['speaker'] }> = [];

  let turnId = 0;
  let cur: Segment[] = [];

  const flush = () => {
    if (!cur.length) return;
    const tStart = cur[0].tStart;
    const tEnd = cur[cur.length - 1].tEnd;
    const speaker =
      cur.every((s) => s.speaker === cur[0].speaker) ? cur[0].speaker : undefined;
    groups.push({ turnId, segments: cur, tStart, tEnd, speaker });
    turnId += 1;
    cur = [];
  };

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const prev = cur[cur.length - 1];

    if (!prev || (s.speaker === prev.speaker && s.tStart - prev.tEnd <= gapMs)) {
      cur.push(s);
    } else {
      flush();
      cur.push(s);
    }
  }
  flush();
  return groups;
}

/* ----------------- helpers ----------------- */

function cloneSeg(s: Segment): Segment {
  return {
    id: s.id,
    speaker: s.speaker,
    modality: s.modality,
    tStart: s.tStart,
    tEnd: s.tEnd,
    text: s.text !== undefined ? s.text : undefined,
    glosses: Array.isArray(s.glosses) ? s.glosses.slice() : undefined,
    confidence: s.confidence,
    provenance: s.provenance,
  };
}

function concatText(a?: string, b?: string): string | null {
  if (a && b) {
    const join = needsSpace(a, b) ? ' ' : '';
    return `${a}${join}${b}`.trim();
  }
  return a ?? b ?? null;
}
function needsSpace(a: string, b: string) {
  // naive join; keep it simple for demo
  return !(a.endsWith(' ') || b.startsWith(' '));
}

function concatGlosses(a?: string[], b?: string[]): string[] {
  const out: string[] = [];
  if (Array.isArray(a)) out.push(...a);
  if (Array.isArray(b)) out.push(...b);
  return out;
}
