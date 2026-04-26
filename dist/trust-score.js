"use strict";
/**
 * Trust Score Protocol (TSP-1.0) — main TrustScore class
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCredentialExpired = exports.TrustScore = void 0;
const types_1 = require("./types");
const hash_1 = require("./hash");
const calculator_1 = require("./calculator");
const credential_1 = require("./credential");
Object.defineProperty(exports, "isCredentialExpired", { enumerable: true, get: function () { return credential_1.isCredentialExpired; } });
const GENESIS = '0';
class TrustScore {
    constructor(entity_id, entity_type) {
        this.evidence_sources = [];
        this.clearpath_summary = null;
        this.cognitive_profile = null;
        this.consent_record = null;
        this.harm_record = null;
        this.history = [];
        this.entity_id = entity_id;
        this.entity_type = entity_type;
    }
    addEvidence(source) {
        this.evidence_sources.push(source);
    }
    addClearpathSummary(summary) {
        this.clearpath_summary = summary;
    }
    addCognitiveProfile(profile) {
        this.cognitive_profile = profile;
    }
    addConsentRecord(record) {
        this.consent_record = record;
    }
    addHarmRecord(record) {
        this.harm_record = record;
    }
    calculate() {
        return this.recalculate();
    }
    recalculate() {
        const previous_hash = this.history.length === 0 ? GENESIS : this.history[this.history.length - 1].hash;
        const record = (0, calculator_1.calculateScore)(this.entity_id, this.entity_type, this.evidence_sources, this.clearpath_summary, this.cognitive_profile, this.consent_record, this.harm_record, this.history, previous_hash);
        record.hash = (0, hash_1.chainHash)(record.previous_hash, (0, hash_1.recordPayload)(record));
        this.history.push(record);
        return record;
    }
    generateCredential(issuer_id, validity_hours) {
        const latest = this.history.length > 0 ? this.history[this.history.length - 1] : this.recalculate();
        return (0, credential_1.generateCredential)(latest, issuer_id, validity_hours);
    }
    static verifyCredential(credential) {
        return (0, credential_1.verifyCredential)(credential);
    }
    checkPolicy(policy) {
        const latest = this.history.length > 0 ? this.history[this.history.length - 1] : null;
        const cred = latest ? (0, credential_1.generateCredential)(latest, 'self') : null;
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
        const failures = [];
        if (latest.overall_score < policy.min_score) {
            failures.push({
                dimension: 'accuracy',
                required: policy.min_score,
                actual: latest.overall_score,
            });
        }
        const levelMins = {
            untrusted: 0,
            provisional: 0.2,
            basic: 0.4,
            established: 0.6,
            high: 0.75,
            exemplary: 0.9,
        };
        const requiredMin = levelMins[policy.required_level] ?? 0;
        if (latest.overall_score < requiredMin && levelMins[latest.level] != null && levelMins[latest.level] < requiredMin) {
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
    meetsMinimum(min_score) {
        const latest = this.history.length > 0 ? this.history[this.history.length - 1] : null;
        if (!latest)
            return false;
        return latest.overall_score >= min_score;
    }
    getHistory() {
        return this.history.slice();
    }
    getTrend(dimension) {
        if (this.history.length < 2)
            return 'stable';
        const last = this.history[this.history.length - 1];
        const prev = this.history[this.history.length - 2];
        const lastScore = dimension
            ? (last.dimensions.find((d) => d.dimension === dimension)?.score ?? 0)
            : last.overall_score;
        const prevScore = dimension
            ? (prev.dimensions.find((d) => d.dimension === dimension)?.score ?? 0)
            : prev.overall_score;
        const diff = lastScore - prevScore;
        if (diff >= 0.05)
            return 'improving';
        if (diff <= -0.05)
            return 'declining';
        return 'stable';
    }
    verify() {
        let valid = true;
        let prev = GENESIS;
        for (const r of this.history) {
            if (r.previous_hash !== prev)
                valid = false;
            const expected = (0, hash_1.chainHash)(r.previous_hash, (0, hash_1.recordPayload)(r));
            if (r.hash !== expected)
                valid = false;
            prev = r.hash;
        }
        return { valid, records_checked: this.history.length };
    }
    toJSON() {
        const snapshot = {
            schema: types_1.schema,
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
    toMarkdown() {
        const latest = this.history.length > 0 ? this.history[this.history.length - 1] : null;
        const lines = [
            '# Trust Score',
            '',
            `**Schema:** ${types_1.schema}  `,
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
    static fromJSON(json) {
        const snapshot = JSON.parse(json);
        if (snapshot.schema !== types_1.schema)
            throw new Error(`Invalid schema: expected ${types_1.schema}`);
        const ts = new TrustScore(snapshot.entity_id, snapshot.entity_type);
        const T = ts;
        T.evidence_sources = snapshot.evidence_sources ?? [];
        T.clearpath_summary = snapshot.clearpath_summary ?? null;
        T.cognitive_profile = snapshot.cognitive_profile ?? null;
        T.consent_record = snapshot.consent_record ?? null;
        T.harm_record = snapshot.harm_record ?? null;
        T.history = snapshot.history ?? [];
        return ts;
    }
}
exports.TrustScore = TrustScore;
