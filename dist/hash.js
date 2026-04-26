"use strict";
/**
 * Trust Score Protocol (TSP-1.0) — hashing and ID generation
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
    return `${d.dimension}:${d.score}:${d.confidence}:${d.evidence_count}:${d.trend}:${d.last_updated}`;
}
function evidencePayload(e) {
    return `${e.type}:${e.source_id}:${e.timestamp}:${e.weight}`;
}
function recordPayload(r) {
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
