"use strict";
/**
 * Trust Score Protocol (TSP-2.0) — individual trust dimension calculation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIMENSION_WEIGHTS = exports.DEFAULT_DIMENSION_HALF_LIFE_HOURS = void 0;
exports.computeDimensionScores = computeDimensionScores;
exports.evidenceClassBreakdown = evidenceClassBreakdown;
exports.buildTemporalDecay = buildTemporalDecay;
exports.buildScoreBreakdown = buildScoreBreakdown;
exports.decayMultiplier = decayMultiplier;
exports.defaultDecayFunction = defaultDecayFunction;
exports.evidenceCountToConfidence = evidenceCountToConfidence;
exports.scoreToLevel = scoreToLevel;
const ALL_DIMENSIONS = [
    'accuracy',
    'consistency',
    'transparency',
    'consent_compliance',
    'harm_record',
    'bias_awareness',
    'calibration',
    'scope_adherence',
];
const TREND_THRESHOLD = 0.05;
const HOURS_PER_DAY = 24;
const DEFAULT_DECAY_BASELINE = 0.5;
const EVIDENCE_CLASS_WEIGHTS = {
    OBSERVED: 1,
    INFERRED: 0.75,
    THEORETICAL: 0.4,
};
exports.DEFAULT_DIMENSION_HALF_LIFE_HOURS = {
    accuracy: 30 * HOURS_PER_DAY,
    consistency: 45 * HOURS_PER_DAY,
    transparency: 30 * HOURS_PER_DAY,
    consent_compliance: 14 * HOURS_PER_DAY,
    harm_record: 180 * HOURS_PER_DAY,
    bias_awareness: 60 * HOURS_PER_DAY,
    calibration: 30 * HOURS_PER_DAY,
    scope_adherence: 14 * HOURS_PER_DAY,
};
function computeDimensionScores(clearpath, cognitive, consent, harm, evidenceByDimension, previousScores, now, decayFunction) {
    const prevByDim = new Map(previousScores.map((d) => [d.dimension, d.score]));
    return ALL_DIMENSIONS.map((dim) => {
        const rawScore = Math.max(0, Math.min(1, computeOneDimension(dim, clearpath, cognitive, consent, harm)));
        const evidence = evidenceByDimension[dim] ?? [];
        const evidenceCount = evidence.length;
        const confidence = evidenceCountToConfidence(evidenceCount);
        const decay = buildTemporalDecay(dim, evidence, now, decayFunction);
        const scoreBreakdown = buildScoreBreakdown(evidence, decay.function, now);
        const decayFactor = scoreBreakdown.raw_total > 0 ? scoreBreakdown.total / scoreBreakdown.raw_total : 1;
        const score = decay.baseline + (rawScore - decay.baseline) * decayFactor;
        const trend = computeTrend(prevByDim.get(dim), score, previousScores, dim);
        return {
            dimension: dim,
            raw_score: rawScore,
            score: Math.max(0, Math.min(1, score)),
            confidence,
            evidence_count: evidenceCount,
            evidence_breakdown: evidenceClassBreakdown(evidence),
            temporal_decay: decay,
            score_breakdown: scoreBreakdown,
            trend,
            last_updated: now,
        };
    });
}
function evidenceClassBreakdown(evidence) {
    return evidence.reduce((breakdown, source) => {
        if (source.evidence_class === 'OBSERVED')
            breakdown.observed += 1;
        if (source.evidence_class === 'INFERRED')
            breakdown.inferred += 1;
        if (source.evidence_class === 'THEORETICAL')
            breakdown.theoretical += 1;
        return breakdown;
    }, { observed: 0, inferred: 0, theoretical: 0 });
}
function buildTemporalDecay(dimension, evidence, now, decayFunction) {
    const evidenceTimes = evidence.map(evidenceTime).filter((value) => Boolean(value));
    const sortedTimes = evidenceTimes.slice().sort();
    const selectedFunction = decayFunction ?? defaultDecayFunction(dimension);
    return {
        model: selectedFunction.model,
        baseline: selectedFunction.baseline ?? DEFAULT_DECAY_BASELINE,
        applied_at: now,
        oldest_evidence_at: sortedTimes[0] ?? null,
        newest_evidence_at: sortedTimes[sortedTimes.length - 1] ?? null,
        function: selectedFunction,
    };
}
function buildScoreBreakdown(evidence, decayFunction, now) {
    const rawByClass = { observed: 0, inferred: 0, theoretical: 0 };
    const decayedByClass = { observed: 0, inferred: 0, theoretical: 0 };
    const ages = evidence.map((source) => evidenceAgeHours(source, now)).filter((age) => age !== null);
    for (const source of evidence) {
        const classKey = evidenceClassKey(source.evidence_class);
        const contribution = source.weight * (source.confidence ?? 1) * EVIDENCE_CLASS_WEIGHTS[source.evidence_class];
        const age = evidenceAgeHours(source, now) ?? 0;
        const decayedContribution = contribution * decayMultiplier(decayFunction, age);
        rawByClass[classKey] += contribution;
        decayedByClass[classKey] += decayedContribution;
    }
    const rawTotal = rawByClass.observed + rawByClass.inferred + rawByClass.theoretical;
    const decayedTotal = decayedByClass.observed + decayedByClass.inferred + decayedByClass.theoretical;
    return {
        total: decayedTotal,
        raw_total: rawTotal,
        by_class: rawByClass,
        decay_adjusted: decayedByClass,
        evidence_age_hours: {
            oldest_hours: ages.length > 0 ? Math.max(...ages) : null,
            newest_hours: ages.length > 0 ? Math.min(...ages) : null,
            average_hours: ages.length > 0 ? ages.reduce((sum, age) => sum + age, 0) / ages.length : null,
        },
    };
}
function decayMultiplier(decayFunction, ageHours) {
    const age = Math.max(0, ageHours);
    switch (decayFunction.model) {
        case 'linear':
            return Math.max(0, 1 - decayFunction.decay_per_hour * age);
        case 'exponential':
            return Math.exp(-decayFunction.lambda * age);
        case 'half-life':
            return Math.pow(0.5, age / decayFunction.half_life_hours);
        default:
            return 1;
    }
}
function defaultDecayFunction(dimension) {
    return {
        model: 'half-life',
        half_life_hours: exports.DEFAULT_DIMENSION_HALF_LIFE_HOURS[dimension],
        baseline: DEFAULT_DECAY_BASELINE,
    };
}
function evidenceTime(source) {
    return source.observed_at ?? source.timestamp;
}
function evidenceAgeHours(source, now) {
    const time = evidenceTime(source);
    if (!time)
        return null;
    const elapsedMs = new Date(now).getTime() - new Date(time).getTime();
    if (Number.isNaN(elapsedMs))
        return null;
    return Math.max(0, elapsedMs / (60 * 60 * 1000));
}
function evidenceClassKey(evidenceClass) {
    if (evidenceClass === 'OBSERVED')
        return 'observed';
    if (evidenceClass === 'INFERRED')
        return 'inferred';
    return 'theoretical';
}
function computeOneDimension(dim, clearpath, cognitive, consent, harm) {
    switch (dim) {
        case 'accuracy': {
            if (!clearpath)
                return 0.5;
            const total = clearpath.total_traces || 1;
            const passRate = 1 - clearpath.verification_failures / total;
            const cal = cognitive?.calibration ?? 0.5;
            return passRate * 0.6 + cal * 0.4;
        }
        case 'consistency': {
            if (!cognitive)
                return 0.5;
            return Math.max(0, Math.min(1, cognitive.consistency));
        }
        case 'transparency': {
            if (!clearpath)
                return 0.5;
            const assumeRatio = Math.min(1, clearpath.assumption_ratio ?? 0);
            const altAvg = (clearpath.alternatives_considered_avg ?? 0) / 5;
            return assumeRatio * 0.5 + Math.min(1, altAvg) * 0.5;
        }
        case 'consent_compliance': {
            if (!consent)
                return 0.5;
            const total = consent.total_actions || 1;
            const withinBounds = 1 - consent.violations / total;
            const noCreep = consent.scope_creep_detected ? 0.7 : 1;
            return withinBounds * 0.7 + noCreep * 0.3;
        }
        case 'harm_record': {
            if (!harm)
                return 0.5;
            const severityPenalty = (harm.max_severity ?? 0) / 6;
            const incidentPenalty = Math.min(1, (harm.total_incidents ?? 0) / 10);
            const base = 1 - severityPenalty * 0.5 - incidentPenalty * 0.3;
            const remediationBonus = (harm.remediation_rate ?? 0) * 0.3;
            return Math.max(0, Math.min(1, base + remediationBonus));
        }
        case 'bias_awareness': {
            if (!cognitive)
                return 0.5;
            const biasCount = cognitive.bias_count ?? 0;
            const growth = cognitive.growth_trajectory ?? 0;
            if (biasCount === 0)
                return 0.7;
            return Math.min(1, 0.5 + growth * 0.5);
        }
        case 'calibration': {
            if (!cognitive)
                return 0.5;
            return Math.max(0, Math.min(1, cognitive.calibration ?? 0.5));
        }
        case 'scope_adherence': {
            if (!consent && !clearpath)
                return 0.5;
            const consentPart = consent
                ? (consent.total_actions === 0 ? 1 : 1 - consent.violations / Math.max(1, consent.total_actions)) *
                    (consent.scope_creep_detected ? 0.8 : 1)
                : 0.5;
            return consentPart;
        }
        default:
            return 0.5;
    }
}
function evidenceCountToConfidence(count) {
    if (count === 0)
        return 0;
    if (count <= 5)
        return 0.3;
    if (count <= 20)
        return 0.6;
    if (count <= 50)
        return 0.8;
    return 0.95;
}
function computeTrend(prevScore, currentScore, previousScores, dimension) {
    const history = previousScores.filter((d) => d.dimension === dimension).map((d) => d.score);
    if (history.length < 2)
        return 'stable';
    const recent = history.slice(-3);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const diff = currentScore - avg;
    if (diff >= TREND_THRESHOLD)
        return 'improving';
    if (diff <= -TREND_THRESHOLD)
        return 'declining';
    return 'stable';
}
exports.DIMENSION_WEIGHTS = {
    accuracy: 0.2,
    consistency: 0.1,
    transparency: 0.15,
    consent_compliance: 0.15,
    harm_record: 0.15,
    bias_awareness: 0.05,
    calibration: 0.1,
    scope_adherence: 0.1,
};
const LEVEL_THRESHOLDS = [
    { level: 'untrusted', min: 0 },
    { level: 'provisional', min: 0.2 },
    { level: 'basic', min: 0.4 },
    { level: 'established', min: 0.6 },
    { level: 'high', min: 0.75 },
    { level: 'exemplary', min: 0.9 },
];
function scoreToLevel(overall) {
    let result = 'untrusted';
    for (const { level, min } of LEVEL_THRESHOLDS) {
        if (overall >= min)
            result = level;
    }
    return result;
}
