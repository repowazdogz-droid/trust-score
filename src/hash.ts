/**
 * Trust Score Protocol (TSP-1.0) — hashing and ID generation
 * Uses Node.js crypto only (zero external dependencies).
 */

import { createHash, randomBytes } from 'crypto';
import type { TrustScoreRecord, DimensionScore, EvidenceSource } from './types';

const HASH_ALGORITHM = 'sha256';
const ID_BYTES = 16;

export function sha256(data: string): string {
  return createHash(HASH_ALGORITHM).update(data, 'utf8').digest('hex');
}

export function chainHash(previousHash: string, payload: string): string {
  return sha256(previousHash + payload);
}

export function generateId(): string {
  return randomBytes(ID_BYTES).toString('hex');
}

function dimPayload(d: DimensionScore): string {
  return `${d.dimension}:${d.score}:${d.confidence}:${d.evidence_count}:${d.trend}:${d.last_updated}`;
}

function evidencePayload(e: EvidenceSource): string {
  return `${e.type}:${e.source_id}:${e.timestamp}:${e.weight}`;
}

export function recordPayload(r: TrustScoreRecord): string {
  const dims = r.dimensions.map(dimPayload).sort((a, b) => a.localeCompare(b)).join(';');
  const sources = r.evidence_sources.map(evidencePayload).sort().join(';');
  const domains = Object.keys(r.domain_scores)
    .sort()
    .map((k) => `${k}:${r.domain_scores[k]}`)
    .join(';');
  return [
    r.id,
    r.entity_id,
    r.entity_type,
    String(r.overall_score),
    r.level,
    dims,
    sources,
    domains,
    r.generated_at,
    r.valid_until,
  ].join('\n');
}
