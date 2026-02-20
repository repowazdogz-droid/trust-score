/**
 * Trust Score Protocol (TSP-1.0)
 * Portable, verifiable trust scores for agents and decision-makers.
 * Zero external dependencies (Node.js crypto only).
 */

export { schema } from './types';
export type {
  TrustDimension,
  TrustLevel,
  DimensionTrend,
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
} from './types';

export { TrustScore, isCredentialExpired } from './trust-score';
export { calculateScore, overallConfidence } from './calculator';
export { generateCredential, verifyCredential } from './credential';
export {
  computeDimensionScores,
  evidenceCountToConfidence,
  DIMENSION_WEIGHTS,
  scoreToLevel,
} from './dimensions';
export { sha256, chainHash, generateId, recordPayload } from './hash';
