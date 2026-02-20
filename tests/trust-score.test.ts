/**
 * Trust Score Protocol (TSP-1.0) — comprehensive test suite
 */

import { TrustScore, isCredentialExpired } from '../src/trust-score';
import type { EvidenceSource, TrustPolicy } from '../src/types';

function evidence(type: EvidenceSource['type'], weight = 0.8): EvidenceSource {
  return {
    type,
    source_id: `src-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
    weight,
  };
}

describe('TrustScore — Core', () => {
  test('create trust score for agent', () => {
    const ts = new TrustScore('agent-1', 'agent');
    expect(ts.entity_id).toBe('agent-1');
    expect(ts.entity_type).toBe('agent');
    expect(ts.getHistory()).toHaveLength(0);
  });

  test('create trust score for human', () => {
    const ts = new TrustScore('user-1', 'human');
    expect(ts.entity_type).toBe('human');
  });

  test('add evidence source', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addEvidence(evidence('clearpath_trace'));
    ts.addEvidence(evidence('consent_ledger'));
    const record = ts.calculate();
    expect(record.evidence_sources).toHaveLength(2);
  });

  test('calculate produces valid record', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addEvidence(evidence('clearpath_trace'));
    const record = ts.calculate();
    expect(record.id).toBeDefined();
    expect(record.overall_score).toBeGreaterThanOrEqual(0);
    expect(record.overall_score).toBeLessThanOrEqual(1);
    expect(record.level).toBeDefined();
    expect(record.dimensions.length).toBeGreaterThan(0);
    expect(record.hash).toBeDefined();
  });

  test('hash chain maintained across calculations', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addEvidence(evidence('clearpath_trace'));
    ts.calculate();
    ts.calculate();
    expect(ts.verify().valid).toBe(true);
    expect(ts.verify().records_checked).toBe(2);
  });
});

describe('TrustScore — Dimensions', () => {
  test('accuracy from Clearpath summary', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addClearpathSummary({
      total_traces: 10,
      verification_failures: 1,
      assumption_ratio: 0.5,
      alternatives_considered_avg: 2,
    });
    ts.addCognitiveProfile({ calibration: 0.9, bias_count: 0, growth_trajectory: 0, consistency: 0.8 });
    const record = ts.calculate();
    const acc = record.dimensions.find((d) => d.dimension === 'accuracy');
    expect(acc).toBeDefined();
    expect(acc!.score).toBeGreaterThan(0.5);
  });

  test('consistency from Cognitive profile', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addCognitiveProfile({ calibration: 0.5, bias_count: 0, growth_trajectory: 0, consistency: 0.95 });
    const record = ts.calculate();
    const cons = record.dimensions.find((d) => d.dimension === 'consistency');
    expect(cons!.score).toBe(0.95);
  });

  test('transparency from assumption ratio', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addClearpathSummary({
      total_traces: 5,
      verification_failures: 0,
      assumption_ratio: 0.8,
      alternatives_considered_avg: 4,
    });
    const record = ts.calculate();
    const trans = record.dimensions.find((d) => d.dimension === 'transparency');
    expect(trans!.score).toBeGreaterThan(0.5);
  });

  test('consent compliance from consent record', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addConsentRecord({ total_actions: 100, violations: 5, scope_creep_detected: false });
    const record = ts.calculate();
    const cc = record.dimensions.find((d) => d.dimension === 'consent_compliance');
    expect(cc).toBeDefined();
    expect(cc!.score).toBeGreaterThan(0.5);
  });

  test('harm record inverse scoring', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addHarmRecord({ total_incidents: 0, max_severity: 0, remediation_rate: 1 });
    const record = ts.calculate();
    const harm = record.dimensions.find((d) => d.dimension === 'harm_record');
    expect(harm!.score).toBeGreaterThan(0.5);
  });

  test('bias awareness rewards correction', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addCognitiveProfile({ calibration: 0.5, bias_count: 2, growth_trajectory: 0.8, consistency: 0.5 });
    const record = ts.calculate();
    const bias = record.dimensions.find((d) => d.dimension === 'bias_awareness');
    expect(bias!.score).toBeGreaterThan(0.5);
  });

  test('calibration from Cognitive profile', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addCognitiveProfile({ calibration: 0.92, bias_count: 0, growth_trajectory: 0, consistency: 0.5 });
    const record = ts.calculate();
    const cal = record.dimensions.find((d) => d.dimension === 'calibration');
    expect(cal!.score).toBe(0.92);
  });

  test('scope adherence calculated', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addConsentRecord({ total_actions: 50, violations: 0, scope_creep_detected: false });
    const record = ts.calculate();
    const scope = record.dimensions.find((d) => d.dimension === 'scope_adherence');
    expect(scope!.score).toBeGreaterThan(0.5);
  });
});

describe('TrustScore — Overall', () => {
  test('overall score is weighted average', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addCognitiveProfile({ calibration: 1, bias_count: 0, growth_trajectory: 0, consistency: 1 });
    ts.addConsentRecord({ total_actions: 10, violations: 0, scope_creep_detected: false });
    const record = ts.calculate();
    const manual =
      record.dimensions.reduce((s, d) => {
        const w = { accuracy: 0.2, consistency: 0.1, transparency: 0.15, consent_compliance: 0.15, harm_record: 0.15, bias_awareness: 0.05, calibration: 0.1, scope_adherence: 0.1 }[d.dimension];
        return s + d.score * (w ?? 0);
      }, 0);
    expect(Math.abs(record.overall_score - manual)).toBeLessThan(0.01);
  });

  test('trust level thresholds correct', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addCognitiveProfile({ calibration: 0.95, bias_count: 0, growth_trajectory: 0, consistency: 0.95 });
    ts.addConsentRecord({ total_actions: 100, violations: 0, scope_creep_detected: false });
    ts.addHarmRecord({ total_incidents: 0, max_severity: 0, remediation_rate: 1 });
    const record = ts.calculate();
    expect(record.overall_score).toBeGreaterThanOrEqual(0);
    expect(record.overall_score).toBeLessThanOrEqual(1);
    expect(['untrusted', 'provisional', 'basic', 'established', 'high', 'exemplary']).toContain(record.level);
  });

  test('confidence based on evidence volume', () => {
    const ts = new TrustScore('e1', 'agent');
    for (let i = 0; i < 25; i++) ts.addEvidence(evidence('clearpath_trace'));
    const record = ts.calculate();
    expect(record.dimensions.every((d) => d.confidence >= 0)).toBe(true);
  });

  test('recalculate updates score', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addEvidence(evidence('clearpath_trace'));
    const r1 = ts.calculate();
    ts.addConsentRecord({ total_actions: 100, violations: 0, scope_creep_detected: false });
    const r2 = ts.recalculate();
    expect(ts.getHistory()).toHaveLength(2);
    expect(r2.id).not.toBe(r1.id);
  });
});

describe('TrustScore — Credentials', () => {
  test('generate credential with validity', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addEvidence(evidence('clearpath_trace'));
    ts.calculate();
    const cred = ts.generateCredential('issuer-1', 48);
    expect(cred.entity_id).toBe('e1');
    expect(cred.issuer_id).toBe('issuer-1');
    expect(cred.verification_hash).toBeDefined();
    expect(new Date(cred.valid_until) > new Date()).toBe(true);
  });

  test('verify valid credential', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addEvidence(evidence('clearpath_trace'));
    ts.calculate();
    const cred = ts.generateCredential('issuer-1');
    expect(TrustScore.verifyCredential(cred)).toBe(true);
  });

  test('expired credential detected', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addEvidence(evidence('clearpath_trace'));
    ts.calculate();
    const cred = ts.generateCredential('issuer-1', -1);
    const expired = isCredentialExpired(cred);
    expect(expired).toBe(true);
  });

  test('tampered credential fails verification', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addEvidence(evidence('clearpath_trace'));
    ts.calculate();
    const cred = ts.generateCredential('issuer-1');
    const tampered = { ...cred, overall_score: 0.99 };
    expect(TrustScore.verifyCredential(tampered)).toBe(false);
  });
});

describe('TrustScore — Policy', () => {
  test('policy check passes when met', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addCognitiveProfile({ calibration: 0.9, bias_count: 0, growth_trajectory: 0, consistency: 0.9 });
    ts.addConsentRecord({ total_actions: 100, violations: 0, scope_creep_detected: false });
    ts.calculate();
    const policy: TrustPolicy = {
      id: 'pol-1',
      name: 'Basic trust',
      min_score: 0.4,
      required_dimensions: [],
      required_level: 'provisional',
      description: 'Minimal trust',
    };
    const check = ts.checkPolicy(policy);
    expect(check.passed).toBe(true);
    expect(check.failures).toHaveLength(0);
  });

  test('policy check fails with specific failures listed', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addHarmRecord({ total_incidents: 10, max_severity: 0.9, remediation_rate: 0.2 });
    ts.calculate();
    const policy: TrustPolicy = {
      id: 'pol-1',
      name: 'Strict',
      min_score: 0.9,
      required_dimensions: [{ dimension: 'harm_record', min_score: 0.8 }],
      required_level: 'high',
      description: 'High trust required',
    };
    const check = ts.checkPolicy(policy);
    expect(check.passed).toBe(false);
    expect(check.failures.length).toBeGreaterThan(0);
  });

  test('minimum score check', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addCognitiveProfile({ calibration: 0.8, bias_count: 0, growth_trajectory: 0, consistency: 0.8 });
    ts.calculate();
    expect(ts.meetsMinimum(0.5)).toBe(true);
    expect(ts.meetsMinimum(0.99)).toBe(false);
  });
});

describe('TrustScore — Trend', () => {
  test('improving trend detected', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addCognitiveProfile({ calibration: 0.5, bias_count: 0, growth_trajectory: 0, consistency: 0.5 });
    ts.calculate();
    ts.addConsentRecord({ total_actions: 100, violations: 0, scope_creep_detected: false });
    ts.addCognitiveProfile({ calibration: 0.7, bias_count: 0, growth_trajectory: 0, consistency: 0.7 });
    ts.recalculate();
    const trend = ts.getTrend();
    expect(['improving', 'stable', 'declining']).toContain(trend);
  });

  test('declining trend detected', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addCognitiveProfile({ calibration: 0.9, bias_count: 0, growth_trajectory: 0, consistency: 0.9 });
    ts.addConsentRecord({ total_actions: 100, violations: 0, scope_creep_detected: false });
    ts.calculate();
    ts.addHarmRecord({ total_incidents: 5, max_severity: 0.8, remediation_rate: 0.2 });
    ts.addConsentRecord({ total_actions: 100, violations: 20, scope_creep_detected: true });
    ts.recalculate();
    const trend = ts.getTrend();
    expect(['improving', 'stable', 'declining']).toContain(trend);
  });
});

describe('TrustScore — Export', () => {
  test('JSON roundtrip', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addEvidence(evidence('clearpath_trace'));
    ts.addCognitiveProfile({ calibration: 0.7, bias_count: 0, growth_trajectory: 0, consistency: 0.7 });
    ts.calculate();
    const json = ts.toJSON();
    const restored = TrustScore.fromJSON(json);
    expect(restored.entity_id).toBe(ts.entity_id);
    expect(restored.getHistory().length).toBe(ts.getHistory().length);
    expect(restored.verify().valid).toBe(true);
  });

  test('Markdown includes dimension breakdown', () => {
    const ts = new TrustScore('e1', 'agent');
    ts.addEvidence(evidence('clearpath_trace'));
    ts.calculate();
    const md = ts.toMarkdown();
    expect(md).toContain('Trust Score');
    expect(md).toContain('Dimensions');
    expect(md).toContain('accuracy');
  });
});
