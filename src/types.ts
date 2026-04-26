/**
 * Trust Score Protocol (TSP-2.0) — type definitions
 */

export const schema = 'TSP-2.0' as const;
export const legacySchema = 'TSP-1.0' as const;

export type TrustDimension =
  | 'accuracy'
  | 'consistency'
  | 'transparency'
  | 'consent_compliance'
  | 'harm_record'
  | 'bias_awareness'
  | 'calibration'
  | 'scope_adherence';

export type TrustLevel =
  | 'untrusted'
  | 'provisional'
  | 'basic'
  | 'established'
  | 'high'
  | 'exemplary';

export type DimensionTrend = 'improving' | 'stable' | 'declining';

export type EvidenceClass = 'OBSERVED' | 'INFERRED' | 'THEORETICAL';

export type TemporalDecayFunction =
  | { model: 'linear'; baseline?: number; decay_per_hour: number }
  | { model: 'exponential'; baseline?: number; lambda: number }
  | { model: 'half-life'; baseline?: number; half_life_hours: number };

export interface EvidenceClassBreakdown {
  observed: number;
  inferred: number;
  theoretical: number;
}

export interface EvidenceAgeBreakdown {
  oldest_hours: number | null;
  newest_hours: number | null;
  average_hours: number | null;
}

export interface TemporalDecay {
  model: TemporalDecayFunction['model'];
  baseline: number;
  applied_at: string;
  oldest_evidence_at: string | null;
  newest_evidence_at: string | null;
  function: TemporalDecayFunction;
}

export interface ScoreBreakdown {
  total: number;
  raw_total: number;
  by_class: EvidenceClassBreakdown;
  decay_adjusted: EvidenceClassBreakdown;
  evidence_age_hours: EvidenceAgeBreakdown;
}

export interface EvidenceSource {
  type: 'clearpath_trace' | 'cognitive_ledger' | 'consent_ledger' | 'harm_trace' | 'external_attestation';
  source_id: string;
  timestamp: string;
  weight: number;
  evidence_class: EvidenceClass;
  observed_at?: string;
  expires_at?: string;
  confidence?: number;
}

export interface DimensionScore {
  dimension: TrustDimension;
  raw_score: number;
  score: number;
  confidence: number;
  evidence_count: number;
  evidence_breakdown: EvidenceClassBreakdown;
  temporal_decay: TemporalDecay;
  score_breakdown: ScoreBreakdown;
  trend: DimensionTrend;
  last_updated: string;
}

export interface TrustScoreRecord {
  schema: typeof schema;
  id: string;
  entity_id: string;
  entity_type: 'agent' | 'human' | 'system';
  raw_overall_score: number;
  overall_score: number;
  level: TrustLevel;
  dimensions: DimensionScore[];
  evidence_sources: EvidenceSource[];
  evidence_breakdown: EvidenceClassBreakdown;
  temporal_decay: TemporalDecay;
  score_breakdown: ScoreBreakdown;
  domain_scores: Record<string, number>;
  generated_at: string;
  valid_until: string;
  hash: string;
  previous_hash: string;
}

export interface TrustCredential {
  schema: typeof schema;
  id: string;
  entity_id: string;
  raw_overall_score: number;
  overall_score: number;
  level: TrustLevel;
  dimensions: DimensionScore[];
  evidence_breakdown: EvidenceClassBreakdown;
  temporal_decay: TemporalDecay;
  score_breakdown: ScoreBreakdown;
  domain_scores: Record<string, number>;
  generated_at: string;
  score_generated_at: string;
  valid_until: string;
  credential_valid_until: string;
  issuer_id: string;
  verification_hash: string;
}

export interface TrustPolicy {
  id: string;
  name: string;
  min_score: number;
  required_dimensions: { dimension: TrustDimension; min_score: number }[];
  required_level: TrustLevel;
  min_observed_ratio?: number;
  max_score_age_hours?: number;
  required_evidence_classes?: EvidenceClass[];
  dimension_freshness?: { dimension: TrustDimension; max_age_hours: number }[];
  description: string;
}

export interface PolicyCheck {
  policy_id: string;
  credential_id: string;
  passed: boolean;
  failures: { dimension: TrustDimension; required: number; actual: number; reason?: string }[];
  checked_at: string;
}

export interface ClearpathSummary {
  total_traces: number;
  verification_failures: number;
  assumption_ratio: number;
  alternatives_considered_avg: number;
}

export interface CognitiveProfile {
  calibration: number;
  bias_count: number;
  growth_trajectory: number;
  consistency: number;
}

export interface ConsentRecord {
  total_actions: number;
  violations: number;
  scope_creep_detected: boolean;
}

export interface HarmRecord {
  total_incidents: number;
  max_severity: number;
  remediation_rate: number;
}

export interface ProtocolSnapshot {
  schema: typeof schema | typeof legacySchema;
  entity_id: string;
  entity_type: 'agent' | 'human' | 'system';
  evidence_sources: EvidenceSource[];
  clearpath_summary: ClearpathSummary | null;
  cognitive_profile: CognitiveProfile | null;
  consent_record: ConsentRecord | null;
  harm_record: HarmRecord | null;
  history: TrustScoreRecord[];
}

export interface VerifyResult {
  valid: boolean;
  records_checked: number;
}

export interface ScoreEvaluationOptions {
  evaluation_time?: string | Date;
  decay_function?: TemporalDecayFunction;
  validity_hours?: number;
}
