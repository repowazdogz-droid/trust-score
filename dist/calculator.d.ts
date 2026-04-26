/**
 * Trust Score Protocol (TSP-2.0) — score calculation engine
 */
import type { TrustScoreRecord, EvidenceSource, ClearpathSummary, CognitiveProfile, ConsentRecord, HarmRecord, ScoreEvaluationOptions } from './types';
export declare function calculateScore(entity_id: string, entity_type: 'agent' | 'human' | 'system', evidence_sources: EvidenceSource[], clearpath_summary: ClearpathSummary | null, cognitive_profile: CognitiveProfile | null, consent_record: ConsentRecord | null, harm_record: HarmRecord | null, previousRecords: TrustScoreRecord[], previous_hash: string, options?: number | ScoreEvaluationOptions): TrustScoreRecord;
export declare function overallConfidence(evidenceCount: number): number;
//# sourceMappingURL=calculator.d.ts.map