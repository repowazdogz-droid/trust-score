"use strict";
/**
 * Trust Score Protocol (TSP-2.0) — hashing and ID generation
 * Uses Node.js crypto only (zero external dependencies).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = sha256;
exports.chainHash = chainHash;
exports.generateId = generateId;
exports.recordPayload = recordPayload;
const crypto_1 = require("crypto");
const HASH_ALGORITHM = 'sha256';
const ID_BYTES = 16;
function sha256(data) {
    return (0, crypto_1.createHash)(HASH_ALGORITHM).update(data, 'utf8').digest('hex');
}
function chainHash(previousHash, payload) {
    return sha256(previousHash + payload);
}
function generateId() {
    return (0, crypto_1.randomBytes)(ID_BYTES).toString('hex');
}
function dimPayload(d) {
    return [
        d.dimension,
        d.raw_score,
        d.score,
        d.confidence,
        d.evidence_count,
        stableStringify(d.evidence_breakdown),
        stableStringify(d.temporal_decay),
        stableStringify(d.score_breakdown),
        d.trend,
        d.last_updated,
    ].join(':');
}
function evidencePayload(e) {
    return [
        e.type,
        e.source_id,
        e.timestamp,
        e.weight,
        e.evidence_class,
        e.observed_at ?? '',
        e.expires_at ?? '',
        e.confidence ?? '',
    ].join(':');
}
function recordPayload(r) {
    const dims = r.dimensions.map(dimPayload).sort((a, b) => a.localeCompare(b)).join(';');
    const sources = r.evidence_sources.map(evidencePayload).sort().join(';');
    const domains = Object.keys(r.domain_scores)
        .sort()
        .map((k) => `${k}:${r.domain_scores[k]}`)
        .join(';');
    return [
        r.schema,
        r.id,
        r.entity_id,
        r.entity_type,
        String(r.raw_overall_score),
        String(r.overall_score),
        r.level,
        dims,
        sources,
        stableStringify(r.evidence_breakdown),
        stableStringify(r.temporal_decay),
        stableStringify(r.score_breakdown),
        domains,
        r.generated_at,
        r.valid_until,
    ].join('\n');
}
function stableStringify(value) {
    if (value === null || typeof value !== 'object')
        return JSON.stringify(value);
    if (Array.isArray(value))
        return `[${value.map(stableStringify).join(',')}]`;
    const entries = Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`);
    return `{${entries.join(',')}}`;
}
