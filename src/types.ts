/**
 * Trust Score Protocol (TSP-1.0) — type definitions
 */

export const schema = 'TSP-1.0' as const;

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

export interface EvidenceSource {
  type: 'clearpath_trace' | 'cognitive_ledger' | 'consent_ledger' | 'harm_trace' | 'external_attestation';
  source_id: string;
  timestamp: string;
  weight: number;
}

export interface DimensionScore {
  dimension: TrustDimension;
  score: number;
  confidence: number;
  evidence_count: number;
  trend: DimensionTrend;
  last_updated: string;
}

export interface TrustScoreRecord {
  id: string;
  entity_id: string;
  entity_type: 'agent' | 'human' | 'system';
  overall_score: number;
  level: TrustLevel;
  dimensions: DimensionScore[];
  evidence_sources: EvidenceSource[];
  domain_scores: Record<string, number>;
  generated_at: string;
  valid_until: string;
  hash: string;
  previous_hash: string;
}

export interface TrustCredential {
  id: string;
  entity_id: string;
  overall_score: number;
  level: TrustLevel;
  dimensions: DimensionScore[];
  domain_scores: Record<string, number>;
  generated_at: string;
  valid_until: string;
  issuer_id: string;
  verification_hash: string;
}

export interface TrustPolicy {
  id: string;
  name: string;
  min_score: number;
  required_dimensions: { dimension: TrustDimension; min_score: number }[];
  required_level: TrustLevel;
  description: string;
}

export interface PolicyCheck {
  policy_id: string;
  credential_id: string;
  passed: boolean;
  failures: { dimension: TrustDimension; required: number; actual: number }[];
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
  schema: typeof schema;
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
