"use strict";
/**
 * Trust Score Protocol (TSP-2.0) — score calculation engine
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateScore = calculateScore;
exports.overallConfidence = overallConfidence;
const hash_1 = require("./hash");
const dimensions_1 = require("./dimensions");
const DEFAULT_VALIDITY_HOURS = 24;
function calculateScore(entity_id, entity_type, evidence_sources, clearpath_summary, cognitive_profile, consent_record, harm_record, previousRecords, previous_hash, options = DEFAULT_VALIDITY_HOURS) {
    const normalizedOptions = typeof options === 'number' ? { validity_hours: options } : options;
    const evaluationDate = normalizedOptions.evaluation_time
        ? new Date(normalizedOptions.evaluation_time)
        : new Date();
    const id = (0, hash_1.generateId)();
    const now = evaluationDate.toISOString();
    const validityHours = normalizedOptions.validity_hours ?? DEFAULT_VALIDITY_HOURS;
    const validUntil = new Date(evaluationDate.getTime() + validityHours * 60 * 60 * 1000).toISOString();
    const evidenceByDim = {};
    for (const d of ['accuracy', 'consistency', 'transparency', 'consent_compliance', 'harm_record', 'bias_awareness', 'calibration', 'scope_adherence']) {
        evidenceByDim[d] = evidence_sources;
    }
    const previousScores = previousRecords.length > 0 ? previousRecords[previousRecords.length - 1].dimensions : [];
    const dimensions = (0, dimensions_1.computeDimensionScores)(clearpath_summary, cognitive_profile, consent_record, harm_record, evidenceByDim, previousScores, now, normalizedOptions.decay_function);
    const raw_overall_score = dimensions.reduce((sum, d) => sum + d.raw_score * dimensions_1.DIMENSION_WEIGHTS[d.dimension], 0);
    const overall_score = dimensions.reduce((sum, d) => sum + d.score * dimensions_1.DIMENSION_WEIGHTS[d.dimension], 0);
    const level = (0, dimensions_1.scoreToLevel)(overall_score);
    const domain_scores = {};
    const temporal_decay = (0, dimensions_1.buildTemporalDecay)('accuracy', evidence_sources, now, normalizedOptions.decay_function);
    const score_breakdown = (0, dimensions_1.buildScoreBreakdown)(evidence_sources, temporal_decay.function, now);
    const record = {
        schema: 'TSP-2.0',
        id,
        entity_id,
        entity_type,
        raw_overall_score,
        overall_score,
        level,
        dimensions,
        evidence_sources: [...evidence_sources],
        evidence_breakdown: (0, dimensions_1.evidenceClassBreakdown)(evidence_sources),
        temporal_decay,
        score_breakdown,
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
