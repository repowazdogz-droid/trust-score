/**
 * Trust Score Protocol (TSP-2.0)
 * Portable, time-aware, verifiable trust scores for agents and decision-makers.
 * Zero external dependencies (Node.js crypto only).
 */

export { legacySchema, schema } from './types';
export type {
  TrustDimension,
  TrustLevel,
  DimensionTrend,
  EvidenceClass,
  TemporalDecayFunction,
  EvidenceClassBreakdown,
  EvidenceAgeBreakdown,
  TemporalDecay,
  ScoreBreakdown,
  EvidenceSource,
  DimensionScore,
  TrustScoreRecord,
  TrustCredential,
  TrustPolicy,
  PolicyCheck,
  ClearpathSummary,
  CognitiveProfile,
  ConsentRecord,
  HarmRecord,
  ProtocolSnapshot,
  VerifyResult,
  ScoreEvaluationOptions,
} from './types';

export { TrustScore, isCredentialExpired } from './trust-score';
export { calculateScore, overallConfidence } from './calculator';
export { generateCredential, verifyCredential } from './credential';
export {
  computeDimensionScores,
  buildScoreBreakdown,
  buildTemporalDecay,
  decayMultiplier,
  defaultDecayFunction,
  evidenceClassBreakdown,
  evidenceCountToConfidence,
  DIMENSION_WEIGHTS,
  DEFAULT_DIMENSION_HALF_LIFE_HOURS,
  scoreToLevel,
} from './dimensions';
export { sha256, chainHash, generateId, recordPayload } from './hash';
