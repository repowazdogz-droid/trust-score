/**
 * Trust Score Protocol (TSP-1.0) — score calculation engine
 */
import type { TrustScoreRecord, EvidenceSource, ClearpathSummary, CognitiveProfile, ConsentRecord, HarmRecord } from './types';
export declare function calculateScore(entity_id: string, entity_type: 'agent' | 'human' | 'system', evidence_sources: EvidenceSource[], clearpath_summary: ClearpathSummary | null, cognitive_profile: CognitiveProfile | null, consent_record: ConsentRecord | null, harm_record: HarmRecord | null, previousRecords: TrustScoreRecord[], previous_hash: string, validity_hours?: number): TrustScoreRecord;
export declare function overallConfidence(evidenceCount: number): number;
//# sourceMappingURL=calculator.d.ts.map