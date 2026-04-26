/**
 * Trust Score Protocol (TSP-2.0) — portable trust credential generation and verification
 */

import type { TrustCredential, TrustScoreRecord } from './types';
import { sha256, generateId } from './hash';

const DEFAULT_VALIDITY_HOURS = 24;

export function generateCredential(
  record: TrustScoreRecord,
  issuer_id: string,
  validity_hours: number = DEFAULT_VALIDITY_HOURS
): TrustCredential {
  const generatedAt = new Date().toISOString();
  const validUntil = new Date(Date.now() + validity_hours * 60 * 60 * 1000).toISOString();
  const cred: TrustCredential = {
    schema: 'TSP-2.0',
    id: generateId(),
    entity_id: record.entity_id,
    raw_overall_score: record.raw_overall_score,
    overall_score: record.overall_score,
    level: record.level,
    dimensions: record.dimensions,
    evidence_breakdown: record.evidence_breakdown,
    temporal_decay: record.temporal_decay,
    score_breakdown: record.score_breakdown,
    domain_scores: { ...record.domain_scores },
    generated_at: generatedAt,
    score_generated_at: record.generated_at,
    valid_until: validUntil,
    credential_valid_until: validUntil,
    issuer_id,
    verification_hash: '',
  };
  cred.verification_hash = credentialContentHash(cred);
  return cred;
}

function credentialContentHash(cred: Omit<TrustCredential, 'verification_hash'>): string {
  const domains = Object.keys(cred.domain_scores)
    .sort()
    .map((k) => `${k}:${cred.domain_scores[k]}`)
    .join('|');
  const payload = [
    cred.schema,
    cred.id,
    cred.entity_id,
    cred.raw_overall_score,
    cred.overall_score,
    cred.level,
    stableStringify(cred.dimensions),
    stableStringify(cred.evidence_breakdown),
    stableStringify(cred.temporal_decay),
    stableStringify(cred.score_breakdown),
    domains,
    cred.generated_at,
    cred.score_generated_at,
    cred.valid_until,
    cred.credential_valid_until,
    cred.issuer_id,
  ].join('\n');
  return sha256(payload);
}

export function verifyCredential(credential: TrustCredential): boolean {
  const { verification_hash, ...rest } = credential;
  const expected = credentialContentHash(rest);
  return expected === verification_hash;
}

export function isCredentialExpired(credential: TrustCredential): boolean {
  return new Date(credential.credential_valid_until ?? credential.valid_until) < new Date();
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`);
  return `{${entries.join(',')}}`;
}
