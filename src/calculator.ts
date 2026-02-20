/**
 * Trust Score Protocol (TSP-1.0) — score calculation engine
 */

import type {
  TrustScoreRecord,
  EvidenceSource,
  TrustDimension,
  ClearpathSummary,
  CognitiveProfile,
  ConsentRecord,
  HarmRecord,
} from './types';
import { generateId } from './hash';
import {
  computeDimensionScores,
  evidenceCountToConfidence,
  DIMENSION_WEIGHTS,
  scoreToLevel,
} from './dimensions';

const DEFAULT_VALIDITY_HOURS = 24;

export function calculateScore(
  entity_id: string,
  entity_type: 'agent' | 'human' | 'system',
  evidence_sources: EvidenceSource[],
  clearpath_summary: ClearpathSummary | null,
  cognitive_profile: CognitiveProfile | null,
  consent_record: ConsentRecord | null,
  harm_record: HarmRecord | null,
  previousRecords: TrustScoreRecord[],
  previous_hash: string,
  validity_hours: number = DEFAULT_VALIDITY_HOURS
): TrustScoreRecord {
  const id = generateId();
  const now = new Date().toISOString();
  const validUntil = new Date(Date.now() + validity_hours * 60 * 60 * 1000).toISOString();
  const evidenceCount = evidence_sources.length;
  const evidenceByDim: Partial<Record<TrustDimension, number>> = {};
  for (const d of ['accuracy', 'consistency', 'transparency', 'consent_compliance', 'harm_record', 'bias_awareness', 'calibration', 'scope_adherence'] as const) {
    evidenceByDim[d] = evidenceCount;
  }
  const previousScores = previousRecords.length > 0 ? previousRecords[previousRecords.length - 1]!.dimensions : [];
  const dimensions = computeDimensionScores(
    clearpath_summary,
    cognitive_profile,
    consent_record,
    harm_record,
    evidenceByDim,
    previousScores,
    now
  );
  const overall_score = dimensions.reduce(
    (sum, d) => sum + d.score * DIMENSION_WEIGHTS[d.dimension],
    0
  );
  const level = scoreToLevel(overall_score);
  const domain_scores: Record<string, number> = {};
  const record: TrustScoreRecord = {
    id,
    entity_id,
    entity_type,
    overall_score,
    level,
    dimensions,
    evidence_sources: [...evidence_sources],
    domain_scores,
    generated_at: now,
    valid_until: validUntil,
    previous_hash,
    hash: '',
  };
  return record;
}

export function overallConfidence(evidenceCount: number): number {
  return evidenceCountToConfidence(evidenceCount);
}
