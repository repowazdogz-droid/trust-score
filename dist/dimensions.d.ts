/**
 * Trust Score Protocol (TSP-2.0) — individual trust dimension calculation
 */
import type { TrustDimension, DimensionScore, TrustLevel, ClearpathSummary, CognitiveProfile, ConsentRecord, HarmRecord, EvidenceClassBreakdown, EvidenceSource, ScoreBreakdown, TemporalDecay, TemporalDecayFunction } from './types';
export declare const DEFAULT_DIMENSION_HALF_LIFE_HOURS: Record<TrustDimension, number>;
export declare function computeDimensionScores(clearpath: ClearpathSummary | null, cognitive: CognitiveProfile | null, consent: ConsentRecord | null, harm: HarmRecord | null, evidenceByDimension: Partial<Record<TrustDimension, EvidenceSource[]>>, previousScores: DimensionScore[], now: string, decayFunction?: TemporalDecayFunction): DimensionScore[];
export declare function evidenceClassBreakdown(evidence: EvidenceSource[]): EvidenceClassBreakdown;
export declare function buildTemporalDecay(dimension: TrustDimension, evidence: EvidenceSource[], now: string, decayFunction?: TemporalDecayFunction): TemporalDecay;
export declare function buildScoreBreakdown(evidence: EvidenceSource[], decayFunction: TemporalDecayFunction, now: string): ScoreBreakdown;
export declare function decayMultiplier(decayFunction: TemporalDecayFunction, ageHours: number): number;
export declare function defaultDecayFunction(dimension: TrustDimension): TemporalDecayFunction;
export declare function evidenceCountToConfidence(count: number): number;
export declare const DIMENSION_WEIGHTS: Record<TrustDimension, number>;
export declare function scoreToLevel(overall: number): TrustLevel;
//# sourceMappingURL=dimensions.d.ts.map