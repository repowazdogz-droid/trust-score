/**
 * Trust Score Protocol (TSP-2.0) — score calculation engine
 */

import type {
  TrustScoreRecord,
  EvidenceSource,
  TrustDimension,
  ClearpathSummary,
  CognitiveProfile,
  ConsentRecord,
  HarmRecord,
  ScoreEvaluationOptions,
} from './types';
import { generateId } from './hash';
import {
  buildScoreBreakdown,
  buildTemporalDecay,
  computeDimensionScores,
  evidenceClassBreakdown,
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
  options: number | ScoreEvaluationOptions = DEFAULT_VALIDITY_HOURS
): TrustScoreRecord {
  const normalizedOptions = typeof options === 'number' ? { validity_hours: options } : options;
  const evaluationDate = normalizedOptions.evaluation_time
    ? new Date(normalizedOptions.evaluation_time)
    : new Date();
  const id = generateId();
  const now = evaluationDate.toISOString();
  const validityHours = normalizedOptions.validity_hours ?? DEFAULT_VALIDITY_HOURS;
  const validUntil = new Date(evaluationDate.getTime() + validityHours * 60 * 60 * 1000).toISOString();
  const evidenceByDim: Partial<Record<TrustDimension, EvidenceSource[]>> = {};
  for (const d of ['accuracy', 'consistency', 'transparency', 'consent_compliance', 'harm_record', 'bias_awareness', 'calibration', 'scope_adherence'] as const) {
    evidenceByDim[d] = evidence_sources;
  }
  const previousScores = previousRecords.length > 0 ? previousRecords[previousRecords.length - 1]!.dimensions : [];
  const dimensions = computeDimensionScores(
    clearpath_summary,
    cognitive_profile,
    consent_record,
    harm_record,
    evidenceByDim,
    previousScores,
    now,
    normalizedOptions.decay_function
  );
  const raw_overall_score = dimensions.reduce(
    (sum, d) => sum + d.raw_score * DIMENSION_WEIGHTS[d.dimension],
    0
  );
  const overall_score = dimensions.reduce(
    (sum, d) => sum + d.score * DIMENSION_WEIGHTS[d.dimension],
    0
  );
  const level = scoreToLevel(overall_score);
  const domain_scores: Record<string, number> = {};
  const temporal_decay = buildTemporalDecay('accuracy', evidence_sources, now, normalizedOptions.decay_function);
  const score_breakdown = buildScoreBreakdown(evidence_sources, temporal_decay.function, now);
  const record: TrustScoreRecord = {
    schema: 'TSP-2.0',
    id,
    entity_id,
    entity_type,
    raw_overall_score,
    overall_score,
    level,
    dimensions,
    evidence_sources: [...evidence_sources],
    evidence_breakdown: evidenceClassBreakdown(evidence_sources),
    temporal_decay,
    score_breakdown,
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
