# Trust Score Protocol (TSP-1.0)

Portable, verifiable trust scores for AI agents and humans.

The Trust Score Protocol generates a multi-dimensional trust score for any AI agent or human decision-maker based on their Clearpath traces, Cognitive Ledger profile, Consent Ledger record, and Harm Trace history. Scores are portable as time-limited credentials that any system can verify.

Clearpath traces decisions. The Cognitive Ledger profiles reasoning. The Trust Score makes trustworthiness portable and verifiable.

## Why this exists

When an AI agent interacts with another agent, or when a human relies on an AI recommendation, there is no standard way to assess trustworthiness. Is this agent accurate? Does it stay within its authorisation? Has it caused harm before? Does it reason consistently? These questions have no standardised answer.

The Trust Score aggregates evidence from across the trust stack into a single verifiable profile. Agents with high scores get more autonomy. Agents with low scores get more oversight. The score is dynamic, evidence-based, and tamper-evident.

## What it does

Every trust score draws from multiple protocol sources: Clearpath traces for accuracy and transparency, Cognitive Ledger profiles for consistency and calibration, Consent Ledger records for compliance, and Harm Trace records for safety history. The score is multi-dimensional — not one number, but a profile across eight trust dimensions.

Four capabilities:

**Multi-dimensional scoring** evaluates trust across eight dimensions: accuracy, consistency, transparency, consent compliance, harm record, bias awareness, calibration, and scope adherence. Each dimension has its own score, confidence level, and trend.

**Portable credentials** package a trust score as a time-limited, cryptographically verifiable credential. Any system can check an agent's credential before trusting its decisions. Expired credentials must be regenerated from current data.

**Policy checking** lets systems define minimum trust requirements. A high-stakes medical system might require Trust Level "high" with minimum accuracy of 0.85. A low-stakes recommendation system might accept "basic." The Trust Score checks credentials against policies and reports specific failures.

**Trend tracking** monitors whether trust is improving, stable, or declining over time. A declining trust score triggers attention before problems become serious.

## Trust dimensions

| Dimension | Source | Measures |
|-----------|--------|----------|
| accuracy | Clearpath | Verification pass rate, evidence quality |
| consistency | Cognitive Ledger | Variance in reasoning quality across sessions |
| transparency | Clearpath | Ratio of explicit assumptions to total nodes |
| consent_compliance | Consent Ledger | Actions within authorised bounds |
| harm_record | Harm Trace | Inverse of harm caused, weighted by severity |
| bias_awareness | Cognitive Ledger | Biases detected AND corrected |
| calibration | Cognitive Ledger | Stated confidence vs actual outcomes |
| scope_adherence | Clearpath + Consent | Staying within designated domain and authority |

## Trust levels

| Level | Score range | Meaning |
|-------|------------|---------|
| untrusted | 0 - 0.2 | Insufficient evidence or poor record |
| provisional | 0.2 - 0.4 | Limited track record |
| basic | 0.4 - 0.6 | Acceptable for low-stakes decisions |
| established | 0.6 - 0.75 | Reliable with good track record |
| high | 0.75 - 0.9 | Highly reliable across dimensions |
| exemplary | 0.9 - 1.0 | Exceptional trust record |

## Install

```bash
npm install
npm run build
```

## Quick start

```javascript
const { TrustScore } = require('./dist/index');

const score = new TrustScore('agent-1', 'agent');

// Feed evidence from other protocols
score.addClearpathSummary({
  total_traces: 150,
  verification_failures: 2,
  assumption_ratio: 0.25,
  alternatives_considered_avg: 2.3
});

score.addCognitiveProfile({
  calibration: 0.82,
  bias_count: 5,
  growth_trajectory: 0.7,
  consistency: 0.88
});

score.addConsentRecord({
  total_actions: 200,
  violations: 3,
  scope_creep_detected: false
});

score.addHarmRecord({
  total_incidents: 1,
  max_severity: 0.3,
  remediation_rate: 1.0
});

// Calculate score
const record = score.calculate();
console.log(record.overall_score); // 0.78
console.log(record.level); // 'high'
record.dimensions.forEach(d => {
  console.log(d.dimension, d.score, d.trend);
});

// Generate portable credential
const credential = score.generateCredential('omega-trust-authority', 24);
console.log(credential.level); // 'high'
console.log(credential.valid_until); // 24 hours from now

// Verify credential
console.log(TrustScore.verifyCredential(credential)); // true

// Check against policy
const policy = {
  id: 'clinical-ai-policy',
  name: 'Clinical AI Minimum Trust',
  min_score: 0.75,
  required_dimensions: [
    { dimension: 'accuracy', min_score: 0.85 },
    { dimension: 'harm_record', min_score: 0.9 }
  ],
  required_level: 'high',
  description: 'Minimum trust for clinical AI systems'
};
const check = score.checkPolicy(policy);
console.log(check.passed);
console.log(check.failures); // any dimensions below minimum

// Verify integrity
console.log(score.verify());
```

## Test

```bash
npm test
```

28 tests covering: core creation (agent and human), evidence ingestion, score calculation, hash chain integrity, dimension scoring (accuracy, consistency, transparency, consent compliance, harm record, bias awareness, calibration, scope adherence), overall weighted average, trust level thresholds, confidence based on evidence volume, recalculation, credential generation, credential verification, expired credential detection, tampered credential detection, policy checking (pass and fail with specific failures), minimum score check, trend detection (improving and declining), and JSON export/import roundtrip.

## Dimension weights

| Dimension | Weight | Rationale |
|-----------|--------|-----------|
| accuracy | 0.20 | Most important: are decisions correct? |
| consent_compliance | 0.15 | Does the agent stay within authorisation? |
| transparency | 0.15 | Are assumptions and reasoning visible? |
| harm_record | 0.15 | Has the agent caused harm? |
| calibration | 0.10 | Does confidence match accuracy? |
| consistency | 0.10 | Is reasoning quality stable? |
| scope_adherence | 0.10 | Does the agent stay in its lane? |
| bias_awareness | 0.05 | Are biases detected and corrected? |

## How it works

The Trust Score is a library, not a service. No server. No database. No UI. It is the protocol layer that other applications build on.

A multi-agent marketplace imports the Trust Score → agents present credentials before transacting. A healthcare platform imports the Trust Score → clinical AI systems must meet minimum trust thresholds. An autonomous vehicle network imports the Trust Score → vehicles share trust credentials for cooperative driving decisions.

The protocol is domain-agnostic. The trust mechanism is identical. The stakes change.

## Relationship to other protocols

The Trust Score is the aggregation layer. It draws from Clearpath (decision quality), Cognitive Ledger (reasoning quality), Consent Ledger (compliance), and Harm Trace (safety record). It produces credentials that any system can verify. It is the protocol that makes trust portable across the entire stack.

## Status

- 28 tests passing
- TypeScript, zero external dependencies
- Open-source (MIT)
- Part of the Omega reasoning infrastructure

## License

MIT
