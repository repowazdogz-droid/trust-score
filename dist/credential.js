"use strict";
/**
 * Trust Score Protocol (TSP-1.0) — portable trust credential generation and verification
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCredential = generateCredential;
exports.verifyCredential = verifyCredential;
exports.isCredentialExpired = isCredentialExpired;
const hash_1 = require("./hash");
const DEFAULT_VALIDITY_HOURS = 24;
function generateCredential(record, issuer_id, validity_hours = DEFAULT_VALIDITY_HOURS) {
    const validUntil = new Date(Date.now() + validity_hours * 60 * 60 * 1000).toISOString();
    const cred = {
        id: (0, hash_1.generateId)(),
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
function credentialContentHash(cred) {
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
    return (0, hash_1.sha256)(payload);
}
function verifyCredential(credential) {
    const { verification_hash, ...rest } = credential;
    const expected = credentialContentHash(rest);
    return expected === verification_hash;
}
function isCredentialExpired(credential) {
    return new Date(credential.valid_until) < new Date();
}
