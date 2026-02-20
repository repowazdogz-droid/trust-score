/**
 * Trust Score Protocol (TSP-1.0) — portable trust credential generation and verification
 */

import type { TrustCredential, TrustScoreRecord, DimensionScore } from './types';
import { sha256, generateId } from './hash';

const DEFAULT_VALIDITY_HOURS = 24;

export function generateCredential(
  record: TrustScoreRecord,
  issuer_id: string,
  validity_hours: number = DEFAULT_VALIDITY_HOURS
): TrustCredential {
  const validUntil = new Date(Date.now() + validity_hours * 60 * 60 * 1000).toISOString();
  const cred: TrustCredential = {
    id: generateId(),
    entity_id: record.entity_id,
    overall_score: record.overall_score,
    level: record.level,
    dimensions: record.dimensions,
    domain_scores: { ...record.domain_scores },
    generated_at: record.generated_at,
    valid_until: validUntil,
    issuer_id,
    verification_hash: '',
  };
  cred.verification_hash = credentialContentHash(cred);
  return cred;
}

function credentialContentHash(cred: Omit<TrustCredential, 'verification_hash'>): string {
  const dims = cred.dimensions
    .map((d) => `${d.dimension}:${d.score}:${d.confidence}:${d.trend}`)
    .sort()
    .join('|');
  const domains = Object.keys(cred.domain_scores)
    .sort()
    .map((k) => `${k}:${cred.domain_scores[k]}`)
    .join('|');
  const payload = [
    cred.id,
    cred.entity_id,
    cred.overall_score,
    cred.level,
    dims,
    domains,
    cred.generated_at,
    cred.valid_until,
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
  return new Date(credential.valid_until) < new Date();
}
