"use strict";
/**
 * Trust Score Protocol (TSP-1.0) — score calculation engine
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateScore = calculateScore;
exports.overallConfidence = overallConfidence;
const hash_1 = require("./hash");
const dimensions_1 = require("./dimensions");
const DEFAULT_VALIDITY_HOURS = 24;
function calculateScore(entity_id, entity_type, evidence_sources, clearpath_summary, cognitive_profile, consent_record, harm_record, previousRecords, previous_hash, validity_hours = DEFAULT_VALIDITY_HOURS) {
    const id = (0, hash_1.generateId)();
    const now = new Date().toISOString();
    const validUntil = new Date(Date.now() + validity_hours * 60 * 60 * 1000).toISOString();
    const evidenceCount = evidence_sources.length;
    const evidenceByDim = {};
    for (const d of ['accuracy', 'consistency', 'transparency', 'consent_compliance', 'harm_record', 'bias_awareness', 'calibration', 'scope_adherence']) {
        evidenceByDim[d] = evidenceCount;
    }
    const previousScores = previousRecords.length > 0 ? previousRecords[previousRecords.length - 1].dimensions : [];
    const dimensions = (0, dimensions_1.computeDimensionScores)(clearpath_summary, cognitive_profile, consent_record, harm_record, evidenceByDim, previousScores, now);
    const overall_score = dimensions.reduce((sum, d) => sum + d.score * dimensions_1.DIMENSION_WEIGHTS[d.dimension], 0);
    const level = (0, dimensions_1.scoreToLevel)(overall_score);
    const domain_scores = {};
    const record = {
        id,
        entity_id,
        entity_type,
        overall_score,
        level,
        dimensions,
        evidence_sources: [...evidence_sources],
        domain_scores,
        generated_at: now,
        valid_until: validUntil,
        previous_hash,
        hash: '',
    };
    return record;
}
function overallConfidence(evidenceCount) {
    return (0, dimensions_1.evidenceCountToConfidence)(evidenceCount);
}
