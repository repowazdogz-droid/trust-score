/**
 * Trust Score Protocol (TSP-2.0) — main TrustScore class
 */
import type { TrustScoreRecord, TrustCredential, TrustPolicy, PolicyCheck, EvidenceSource, ClearpathSummary, CognitiveProfile, ConsentRecord, HarmRecord, TrustDimension, DimensionTrend, VerifyResult, ScoreEvaluationOptions } from './types';
import { isCredentialExpired } from './credential';
export declare class TrustScore {
    readonly entity_id: string;
    readonly entity_type: 'agent' | 'human' | 'system';
    private evidence_sources;
    private clearpath_summary;
    private cognitive_profile;
    private consent_record;
    private harm_record;
    private history;
    constructor(entity_id: string, entity_type: 'agent' | 'human' | 'system');
    addEvidence(source: EvidenceSource): void;
    addClearpathSummary(summary: ClearpathSummary): void;
    addCognitiveProfile(profile: CognitiveProfile): void;
    addConsentRecord(record: ConsentRecord): void;
    addHarmRecord(record: HarmRecord): void;
    calculate(options?: ScoreEvaluationOptions): TrustScoreRecord;
    recalculate(options?: ScoreEvaluationOptions): TrustScoreRecord;
    generateCredential(issuer_id: string, validity_hours?: number): TrustCredential;
    static verifyCredential(credential: TrustCredential): boolean;
    checkPolicy(policy: TrustPolicy): PolicyCheck;
    meetsMinimum(min_score: number): boolean;
    getHistory(): TrustScoreRecord[];
    getTrend(dimension?: TrustDimension): DimensionTrend;
    verify(): VerifyResult;
    toJSON(): string;
    toMarkdown(): string;
    static fromJSON(json: string): TrustScore;
}
export { isCredentialExpired };
//# sourceMappingURL=trust-score.d.ts.map