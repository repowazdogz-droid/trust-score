/**
 * Trust Score Protocol (TSP-2.0) — main TrustScore class
 */

import type {
  TrustScoreRecord,
  TrustCredential,
  TrustPolicy,
  PolicyCheck,
  EvidenceSource,
  ClearpathSummary,
  CognitiveProfile,
  ConsentRecord,
  HarmRecord,
  TrustDimension,
  DimensionTrend,
  ProtocolSnapshot,
  VerifyResult,
  ScoreEvaluationOptions,
} from './types';
import { legacySchema, schema } from './types';
import { chainHash, recordPayload } from './hash';
import { calculateScore } from './calculator';
import { generateCredential, verifyCredential, isCredentialExpired } from './credential';
import { buildScoreBreakdown, buildTemporalDecay, evidenceClassBreakdown } from './dimensions';

const GENESIS = '0';

export class TrustScore {
  readonly entity_id: string;
  readonly entity_type: 'agent' | 'human' | 'system';
  private evidence_sources: EvidenceSource[] = [];
  private clearpath_summary: ClearpathSummary | null = null;
  private cognitive_profile: CognitiveProfile | null = null;
  private consent_record: ConsentRecord | null = null;
  private harm_record: HarmRecord | null = null;
  private history: TrustScoreRecord[] = [];

  constructor(entity_id: string, entity_type: 'agent' | 'human' | 'system') {
    this.entity_id = entity_id;
    this.entity_type = entity_type;
  }

  addEvidence(source: EvidenceSource): void {
    this.evidence_sources.push(source);
  }

  addClearpathSummary(summary: ClearpathSummary): void {
    this.clearpath_summary = summary;
  }

  addCognitiveProfile(profile: CognitiveProfile): void {
    this.cognitive_profile = profile;
  }

  addConsentRecord(record: ConsentRecord): void {
    this.consent_record = record;
  }

  addHarmRecord(record: HarmRecord): void {
    this.harm_record = record;
  }

  calculate(options?: ScoreEvaluationOptions): TrustScoreRecord {
    return this.recalculate(options);
  }

  recalculate(options?: ScoreEvaluationOptions): TrustScoreRecord {
    const previous_hash =
      this.history.length === 0 ? GENESIS : this.history[this.history.length - 1]!.hash;
    const record = calculateScore(
      this.entity_id,
      this.entity_type,
      this.evidence_sources,
      this.clearpath_summary,
      this.cognitive_profile,
      this.consent_record,
      this.harm_record,
      this.history,
      previous_hash,
      options
    );
    record.hash = chainHash(record.previous_hash, recordPayload(record));
    this.history.push(record);
    return record;
  }

  generateCredential(issuer_id: string, validity_hours?: number): TrustCredential {
    const latest = this.history.length > 0 ? this.history[this.history.length - 1]! : this.recalculate();
    return generateCredential(latest, issuer_id, validity_hours);
  }

  static verifyCredential(credential: TrustCredential): boolean {
    return verifyCredential(credential);
  }

  checkPolicy(policy: TrustPolicy): PolicyCheck {
    const latest = this.history.length > 0 ? this.history[this.history.length - 1]! : null;
    const cred = latest ? generateCredential(latest, 'self') : null;
    const credential_id = cred?.id ?? '';
    const checked_at = new Date().toISOString();
    if (!latest) {
      return {
        policy_id: policy.id,
        credential_id: '',
        passed: false,
        failures: policy.required_dimensions.map((r) => ({
          dimension: r.dimension,
          required: r.min_score,
          actual: 0,
        })),
        checked_at,
      };
    }
    const failures: { dimension: TrustDimension; required: number; actual: number; reason?: string }[] = [];
    if (latest.overall_score < policy.min_score) {
      failures.push({
        dimension: 'accuracy',
        required: policy.min_score,
        actual: latest.overall_score,
        reason: 'min_score',
      });
    }
    const levelMins: Record<string, number> = {
      untrusted: 0,
      provisional: 0.2,
      basic: 0.4,
      established: 0.6,
      high: 0.75,
      exemplary: 0.9,
    };
    const requiredMin = levelMins[policy.required_level] ?? 0;
    if (latest.overall_score < requiredMin && levelMins[latest.level] != null && levelMins[latest.level]! < requiredMin) {
      failures.push({
        dimension: 'calibration',
        required: requiredMin,
        actual: latest.overall_score,
        reason: 'required_level',
      });
    }
    for (const req of policy.required_dimensions) {
      const dim = latest.dimensions.find((d) => d.dimension === req.dimension);
      const actual = dim?.score ?? 0;
      if (actual < req.min_score) {
        failures.push({ dimension: req.dimension, required: req.min_score, actual, reason: 'required_dimension' });
      }
    }
    if (policy.min_observed_ratio != null) {
      const totalEvidence =
        latest.evidence_breakdown.observed + latest.evidence_breakdown.inferred + latest.evidence_breakdown.theoretical;
      const observedRatio = totalEvidence > 0 ? latest.evidence_breakdown.observed / totalEvidence : 0;
      if (observedRatio < policy.min_observed_ratio) {
        failures.push({
          dimension: 'accuracy',
          required: policy.min_observed_ratio,
          actual: observedRatio,
          reason: 'min_observed_ratio',
        });
      }
    }
    if (policy.max_score_age_hours != null) {
      const scoreAgeHours = (new Date(checked_at).getTime() - new Date(latest.generated_at).getTime()) / (60 * 60 * 1000);
      if (scoreAgeHours > policy.max_score_age_hours) {
        failures.push({
          dimension: 'calibration',
          required: policy.max_score_age_hours,
          actual: scoreAgeHours,
          reason: 'max_score_age_hours',
        });
      }
    }
    if (policy.required_evidence_classes) {
      for (const evidenceClass of policy.required_evidence_classes) {
        const count =
          evidenceClass === 'OBSERVED'
            ? latest.evidence_breakdown.observed
            : evidenceClass === 'INFERRED'
              ? latest.evidence_breakdown.inferred
              : latest.evidence_breakdown.theoretical;
        if (count === 0) {
          failures.push({
            dimension: 'accuracy',
            required: 1,
            actual: 0,
            reason: `required_evidence_class:${evidenceClass}`,
          });
        }
      }
    }
    if (policy.dimension_freshness) {
      for (const freshness of policy.dimension_freshness) {
        const dim = latest.dimensions.find((d) => d.dimension === freshness.dimension);
        const oldestAge = dim?.score_breakdown.evidence_age_hours.oldest_hours ?? Infinity;
        if (oldestAge > freshness.max_age_hours) {
          failures.push({
            dimension: freshness.dimension,
            required: freshness.max_age_hours,
            actual: oldestAge,
            reason: 'dimension_freshness',
          });
        }
      }
    }
    return {
      policy_id: policy.id,
      credential_id,
      passed: failures.length === 0,
      failures,
      checked_at,
    };
  }

  meetsMinimum(min_score: number): boolean {
    const latest = this.history.length > 0 ? this.history[this.history.length - 1]! : null;
    if (!latest) return false;
    return latest.overall_score >= min_score;
  }

  getHistory(): TrustScoreRecord[] {
    return this.history.slice();
  }

  getTrend(dimension?: TrustDimension): DimensionTrend {
    if (this.history.length < 2) return 'stable';
    const last = this.history[this.history.length - 1]!;
    const prev = this.history[this.history.length - 2]!;
    const lastScore = dimension
      ? (last.dimensions.find((d) => d.dimension === dimension)?.score ?? 0)
      : last.overall_score;
    const prevScore = dimension
      ? (prev.dimensions.find((d) => d.dimension === dimension)?.score ?? 0)
      : prev.overall_score;
    const diff = lastScore - prevScore;
    if (diff >= 0.05) return 'improving';
    if (diff <= -0.05) return 'declining';
    return 'stable';
  }

  verify(): VerifyResult {
    let valid = true;
    let prev = GENESIS;
    for (const r of this.history) {
      if (r.previous_hash !== prev) valid = false;
      const expected = chainHash(r.previous_hash, recordPayload(r));
      if (r.hash !== expected) valid = false;
      prev = r.hash;
    }
    return { valid, records_checked: this.history.length };
  }

  toJSON(): string {
    const snapshot: ProtocolSnapshot = {
      schema,
      entity_id: this.entity_id,
      entity_type: this.entity_type,
      evidence_sources: this.evidence_sources,
      clearpath_summary: this.clearpath_summary,
      cognitive_profile: this.cognitive_profile,
      consent_record: this.consent_record,
      harm_record: this.harm_record,
      history: this.history,
    };
    return JSON.stringify(snapshot, null, 2);
  }

  toMarkdown(): string {
    const latest = this.history.length > 0 ? this.history[this.history.length - 1]! : null;
    const lines: string[] = [
      '# Trust Score',
      '',
      `**Schema:** ${schema}  `,
      `**Entity:** ${this.entity_id} (${this.entity_type})  `,
      '',
    ];
    if (latest) {
      lines.push('## Overall', '');
      lines.push(`| Metric | Value |`);
      lines.push(`|--------|-------|`);
      lines.push(`| Score | ${latest.overall_score.toFixed(2)} |`);
      lines.push(`| Level | ${latest.level} |`);
      lines.push(`| Valid until | ${latest.valid_until} |`);
      lines.push('', '## Dimensions', '');
      for (const d of latest.dimensions) {
        lines.push(`- **${d.dimension}**: ${d.score.toFixed(2)} (confidence ${d.confidence.toFixed(2)}, trend: ${d.trend})`);
      }
    }
    return lines.join('\n');
  }

  static fromJSON(json: string): TrustScore {
    const snapshot = JSON.parse(json) as ProtocolSnapshot;
    if (snapshot.schema !== schema && snapshot.schema !== legacySchema) {
      throw new Error(`Invalid schema: expected ${schema} or ${legacySchema}`);
    }
    const ts = new TrustScore(snapshot.entity_id, snapshot.entity_type);
    const T = ts as unknown as {
      evidence_sources: EvidenceSource[];
      clearpath_summary: ClearpathSummary | null;
      cognitive_profile: CognitiveProfile | null;
      consent_record: ConsentRecord | null;
      harm_record: HarmRecord | null;
      history: TrustScoreRecord[];
    };
    T.evidence_sources = (snapshot.evidence_sources ?? []).map(normalizeEvidenceSource);
    T.clearpath_summary = snapshot.clearpath_summary ?? null;
    T.cognitive_profile = snapshot.cognitive_profile ?? null;
    T.consent_record = snapshot.consent_record ?? null;
    T.harm_record = snapshot.harm_record ?? null;
    T.history = snapshot.schema === legacySchema
      ? migrateLegacyHistory(snapshot.history ?? [], T.evidence_sources)
      : snapshot.history ?? [];
    return ts;
  }
}

export { isCredentialExpired };

function normalizeEvidenceSource(source: EvidenceSource): EvidenceSource {
  return {
    ...source,
    evidence_class: source.evidence_class ?? defaultEvidenceClass(source.type),
  };
}

function defaultEvidenceClass(type: EvidenceSource['type']) {
  if (type === 'cognitive_ledger' || type === 'external_attestation') return 'INFERRED';
  return 'OBSERVED';
}

function migrateLegacyHistory(history: TrustScoreRecord[], evidenceSources: EvidenceSource[]): TrustScoreRecord[] {
  let previousHash = GENESIS;
  return history.map((legacyRecord) => {
    const generatedAt = legacyRecord.generated_at ?? new Date().toISOString();
    const temporalDecay = buildTemporalDecay('accuracy', evidenceSources, generatedAt);
    const migratedDimensions = (legacyRecord.dimensions ?? []).map((dimension) => ({
      ...dimension,
      raw_score: dimension.raw_score ?? dimension.score,
      evidence_breakdown: dimension.evidence_breakdown ?? evidenceClassBreakdown(evidenceSources),
      temporal_decay: dimension.temporal_decay ?? buildTemporalDecay(dimension.dimension, evidenceSources, generatedAt),
      score_breakdown: dimension.score_breakdown ?? buildScoreBreakdown(evidenceSources, temporalDecay.function, generatedAt),
    }));
    const migrated: TrustScoreRecord = {
      ...legacyRecord,
      schema,
      raw_overall_score: legacyRecord.raw_overall_score ?? legacyRecord.overall_score,
      dimensions: migratedDimensions,
      evidence_sources: evidenceSources,
      evidence_breakdown: legacyRecord.evidence_breakdown ?? evidenceClassBreakdown(evidenceSources),
      temporal_decay: legacyRecord.temporal_decay ?? temporalDecay,
      score_breakdown: legacyRecord.score_breakdown ?? buildScoreBreakdown(evidenceSources, temporalDecay.function, generatedAt),
      previous_hash: previousHash,
      hash: '',
    };
    migrated.hash = chainHash(migrated.previous_hash, recordPayload(migrated));
    previousHash = migrated.hash;
    return migrated;
  });
}
