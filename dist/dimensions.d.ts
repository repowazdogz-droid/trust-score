/**
 * Trust Score Protocol (TSP-1.0) — individual trust dimension calculation
 */
import type { TrustDimension, DimensionScore, TrustLevel, ClearpathSummary, CognitiveProfile, ConsentRecord, HarmRecord } from './types';
export declare function computeDimensionScores(clearpath: ClearpathSummary | null, cognitive: CognitiveProfile | null, consent: ConsentRecord | null, harm: HarmRecord | null, evidenceCountByDimension: Partial<Record<TrustDimension, number>>, previousScores: DimensionScore[], now: string): DimensionScore[];
export declare function evidenceCountToConfidence(count: number): number;
export declare const DIMENSION_WEIGHTS: Record<TrustDimension, number>;
export declare function scoreToLevel(overall: number): TrustLevel;
//# sourceMappingURL=dimensions.d.ts.map