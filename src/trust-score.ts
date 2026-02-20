/**
 * Trust Score Protocol (TSP-1.0) — main TrustScore class
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
} from './types';
import { schema } from './types';
import { chainHash, recordPayload } from './hash';
import { calculateScore } from './calculator';
import { generateCredential, verifyCredential, isCredentialExpired } from './credential';

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

  calculate(): TrustScoreRecord {
    return this.recalculate();
  }

  recalculate(): TrustScoreRecord {
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
      previous_hash
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
    const failures: { dimension: TrustDimension; required: number; actual: number }[] = [];
    if (latest.overall_score < policy.min_score) {
      failures.push({
        dimension: 'accuracy',
        required: policy.min_score,
        actual: latest.overall_score,
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
      });
    }
    for (const req of policy.required_dimensions) {
      const dim = latest.dimensions.find((d) => d.dimension === req.dimension);
      const actual = dim?.score ?? 0;
      if (actual < req.min_score) {
        failures.push({ dimension: req.dimension, required: req.min_score, actual });
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
    const snapshot: ProtocolSnapshot = JSON.parse(json);
    if (snapshot.schema !== schema) throw new Error(`Invalid schema: expected ${schema}`);
    const ts = new TrustScore(snapshot.entity_id, snapshot.entity_type);
    const T = ts as unknown as {
      evidence_sources: EvidenceSource[];
      clearpath_summary: ClearpathSummary | null;
      cognitive_profile: CognitiveProfile | null;
      consent_record: ConsentRecord | null;
      harm_record: HarmRecord | null;
      history: TrustScoreRecord[];
    };
    T.evidence_sources = snapshot.evidence_sources ?? [];
    T.clearpath_summary = snapshot.clearpath_summary ?? null;
    T.cognitive_profile = snapshot.cognitive_profile ?? null;
    T.consent_record = snapshot.consent_record ?? null;
    T.harm_record = snapshot.harm_record ?? null;
    T.history = snapshot.history ?? [];
    return ts;
  }
}

export { isCredentialExpired };
