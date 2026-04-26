## 1. CURRENT STATE

TSP-1.0 is a TypeScript library for portable trust scoring, published in this repository as package `trust-score` version `1.0.1`. It has no runtime dependencies, uses Node.js `crypto` for hashes and IDs, exports CommonJS build artifacts from `dist`, and is documented as a protocol layer rather than a service: no server, database, UI, or network runtime.

The current schema is fixed at `TSP-1.0`. It scores `agent`, `human`, or `system` entities across eight dimensions: `accuracy`, `consistency`, `transparency`, `consent_compliance`, `harm_record`, `bias_awareness`, `calibration`, and `scope_adherence`. Each `DimensionScore` carries `score`, `confidence`, `evidence_count`, `trend`, and `last_updated`; each `TrustScoreRecord` carries dimensions, evidence sources, domain scores, timestamps, validity, hash, and previous hash.

Evidence currently records source type, source ID, timestamp, and weight. Supported source types are `clearpath_trace`, `cognitive_ledger`, `consent_ledger`, `harm_trace`, and `external_attestation`. Source type tells where evidence came from, but not whether the claim was directly observed, inferred by a model, or theoretical/speculative.

Scoring is deterministic and simple. Dimension scores are computed from summary objects for Clearpath, Cognitive Ledger, Consent Ledger, and Harm Trace; the overall score is a weighted average; trust level is threshold-based; confidence is evidence-count based; trend is derived from recent score deltas. Existing credential validity is binary: credentials have `valid_until`, and expiration is checked by timestamp, but the score itself does not decay continuously between calculations.

Tests cover core creation, evidence ingestion, hash-chain integrity, all dimension calculations, weighted overall score, trust levels, confidence, recalculation, credential generation and verification, expiration, tamper detection, policy checks, trend detection, and JSON/Markdown export. README reports 28 passing tests; release notes show a 2026-04-26 hygiene pass with no intended schema or runtime semantic change.

## 2. RESEARCH LANDSCAPE (2025-2026)

Recent trust-management literature points in the same direction: trust should be dynamic, multi-factor, temporally bounded, and explainable by provenance rather than presented as a timeless scalar.

`SoK: Credential-Based Trust Management in Decentralized Ledger Systems` (arXiv:2602.07572, 2026) frames decentralized trust management around credential mechanisms, trust evaluation models, dynamicity, temporal consistency, explainability, and configurable decay. It explicitly distinguishes subjective trust from passive reputation and warns that reputation-only feedback loops can centralize trust around already-trusted entities.

`TrustFlow: Topic-Aware Vector Reputation Propagation for Multi-Agent Ecosystems` (arXiv:2603.19452, 2026) argues for multi-dimensional reputation vectors instead of scalar reputation and notes that static accumulation should be extended with temporal edge decay such as `omega(tau) = e^(-lambda * tau)` so stale interactions do not dominate current trust.

`To trust or not to trust: Attention-based Trust Management for LLM Multi-Agent Systems` (arXiv:2506.02546, 2025) uses multiple trust dimensions for LLM agent messages and maintains dynamic trust records. Its relevance to TSP is not the attention mechanism itself, but the claim that agent trust needs interpretable, dimension-specific records rather than a single aggregate.

W3C Verifiable Credentials Data Model v2.x emphasizes that verifiability proves issuer integrity and credential currency, not claim truth. Verifiers still need policy checks over issuer, proof, subject, and claims. W3C Data Integrity 1.x also distinguishes proof validity periods from credential validity periods, which maps cleanly to TSP's need to separate credential expiration from score decay.

W3C Confidence Method v1.0 (2026 Working Draft) lets issuers express mechanisms that raise verifier confidence about credential subjects. It does not define trust-score evidence classes, but it supports the same design principle: claims should carry machine-readable confidence/provenance metadata, and verifiers should decide how much assurance they require.

The practical 2025-2026 consensus is therefore: keep TSP multi-dimensional, make temporal freshness explicit, separate cryptographic validity from trust freshness, and expose the evidentiary basis of each score so policies can treat observed facts differently from inferred or theoretical claims.

## 3. SCHEMA DECISION

TSP-2.0 should be a schema-level upgrade, not a rewrite. The public API can remain library-first and deterministic, but records and credentials should expose two new concepts: temporal decay and evidence-class breakdown.

Recommended schema version: `TSP-2.0`.

Recommended compatibility posture: additive for conceptual model, breaking for serialized records. Existing `TSP-1.0` snapshots should continue to be readable only through an explicit migration path or versioned import, because hash payloads and credential verification hashes must not silently reinterpret missing v2 fields.

Recommended temporal model: exponential decay over elapsed time since evidence observation or score generation:

```text
decayed_score = baseline + (raw_score - baseline) * e^(-lambda * age_hours)
```

The default `baseline` should be `0.5`, matching the current neutral score used when evidence is missing. The default `lambda` should be dimension-specific, because safety, consent, and scope evidence should stale faster than long-run competence evidence. A practical first pass:

| Dimension | Suggested half-life | Rationale |
|-----------|---------------------|-----------|
| accuracy | 30 days | Recent task performance matters, but competence should not vanish overnight. |
| consistency | 45 days | Reasoning stability is medium-term behavior. |
| transparency | 30 days | Explanation quality can change with tooling and prompts. |
| consent_compliance | 14 days | Authorization behavior must be fresh. |
| harm_record | 180 days | Harm history should fade slowly and remain policy-visible. |
| bias_awareness | 60 days | Bias detection and correction should reflect recent practice. |
| calibration | 30 days | Confidence calibration can drift quickly. |
| scope_adherence | 14 days | Domain/authority boundaries are context-sensitive. |

Recommended evidence classes:

| Evidence class | Meaning | Policy treatment |
|----------------|---------|------------------|
| `OBSERVED` | Directly recorded behavior, event, trace, violation, or incident. | Highest weight; suitable for hard policy gates. |
| `INFERRED` | Model-derived or aggregate conclusion from observed inputs. | Useful for scoring, but should require confidence and source transparency. |
| `THEORETICAL` | Declared capability, design claim, simulation, forecast, or unverified expectation. | Lowest weight; useful for cold start and planning, not enough for high-stakes trust alone. |

## 4. PROPOSED SCHEMA CHANGES

Add `EvidenceClass`:

```ts
export type EvidenceClass = 'OBSERVED' | 'INFERRED' | 'THEORETICAL';
```

Extend `EvidenceSource`:

```ts
export interface EvidenceSource {
  type: 'clearpath_trace' | 'cognitive_ledger' | 'consent_ledger' | 'harm_trace' | 'external_attestation';
  source_id: string;
  timestamp: string;
  weight: number;
  evidence_class: EvidenceClass;
  observed_at?: string;
  expires_at?: string;
  confidence?: number;
}
```

Add reusable breakdown objects:

```ts
export interface EvidenceClassBreakdown {
  observed: number;
  inferred: number;
  theoretical: number;
}

export interface TemporalDecay {
  model: 'exponential';
  lambda: number;
  half_life_hours: number;
  baseline: number;
  applied_at: string;
  oldest_evidence_at: string | null;
  newest_evidence_at: string | null;
}
```

Extend `DimensionScore`:

```ts
export interface DimensionScore {
  dimension: TrustDimension;
  raw_score: number;
  score: number;
  confidence: number;
  evidence_count: number;
  evidence_breakdown: EvidenceClassBreakdown;
  temporal_decay: TemporalDecay;
  trend: DimensionTrend;
  last_updated: string;
}
```

Extend `TrustScoreRecord` and `TrustCredential` with record-level summaries:

```ts
export interface TrustScoreRecord {
  schema: 'TSP-2.0';
  evidence_breakdown: EvidenceClassBreakdown;
  temporal_decay: TemporalDecay;
  // existing TSP-1.0 fields remain, with hash payload updated to include all v2 fields
}

export interface TrustCredential {
  schema: 'TSP-2.0';
  evidence_breakdown: EvidenceClassBreakdown;
  temporal_decay: TemporalDecay;
  score_generated_at: string;
  credential_valid_until: string;
  // existing credential fields remain, with verification hash updated to include all v2 fields
}
```

Preserve `valid_until`, but clarify its meaning as credential validity. Add `score_generated_at` and `temporal_decay.applied_at` so verifiers can distinguish a cryptographically current credential from a trust score based on stale evidence.

For policies, add optional freshness and evidence requirements:

```ts
export interface TrustPolicy {
  min_observed_ratio?: number;
  max_score_age_hours?: number;
  required_evidence_classes?: EvidenceClass[];
  dimension_freshness?: { dimension: TrustDimension; max_age_hours: number }[];
}
```

Hash payloads must include `schema`, `raw_score`, `evidence_breakdown`, `temporal_decay`, and new credential validity fields in a canonical order. This is required so v2 records remain tamper-evident and cannot be downgraded by stripping freshness metadata.

## 5. PUBLIC FRAMING UPDATE

Current framing says TSP makes trust portable and verifiable. V2 should sharpen that into: TSP makes trust portable, time-aware, and evidence-classed.

Recommended README-level framing:

```text
The Trust Score Protocol turns cross-protocol evidence into portable trust credentials. TSP-2.0 adds time-aware scoring and evidence-class breakdowns, so verifiers can tell whether a score is based on recent observed behavior, model inference, or theoretical claims.
```

Avoid presenting the overall score as a timeless truth. The public language should say that scores are decision aids for verifier policies, not universal declarations of trustworthiness. This aligns with W3C VC guidance that verifiable credentials prove issuer integrity and currency, while relying parties still evaluate claims under their own policies.

Recommended capability list:

- Multi-dimensional scoring across existing trust dimensions.
- Temporal decay that makes stale evidence visible and bounded.
- Evidence-class breakdown across `OBSERVED`, `INFERRED`, and `THEORETICAL`.
- Portable credentials with distinct credential validity and score freshness.
- Policy checks that can require recent observed evidence for high-stakes domains.

Recommended phrasing for safety-sensitive use:

```text
High scores should not grant autonomy by themselves. TSP credentials should be checked against context-specific policies that consider score, dimension minimums, freshness, evidence class, issuer, and harm history.
```

## 6. CROSS-PROTOCOL RELATIONSHIPS

Clearpath should remain the primary source for observed decision quality, transparency, alternatives considered, assumptions, and scope behavior. Its traces are usually `OBSERVED` when they come from recorded execution, and `INFERRED` when summarized by a model.

Cognitive Ledger should remain the source for reasoning quality, calibration, consistency, growth trajectory, and bias correction. Cognitive summaries are often `INFERRED`, because they are assessments over reasoning records, but individual logged calibration outcomes can be `OBSERVED`.

Consent Ledger should remain the source for authorization, violations, and scope creep. These should usually be `OBSERVED` and should receive short half-lives because permission boundaries change quickly.

Harm Trace should remain the source for incidents, severity, remediation, and recurrence. Harm records should usually be `OBSERVED`; they should decay slowly and remain separately policy-visible so a high recent accuracy score cannot hide unresolved safety history.

External attestations should be allowed but should not be treated as equivalent to direct evidence. Attestations can be `OBSERVED` only when they attest to a directly witnessed event; otherwise they are `INFERRED` or `THEORETICAL` depending on content.

TSP should not absorb the other protocols' schemas. It should keep consuming compact summaries and evidence references, then produce verifiable aggregate credentials. The v2 relationship is therefore: source protocols explain what happened; TSP explains how much that evidence currently supports trust.

## 7. IMPLEMENTATION SCOPE

Minimal v2 implementation should touch only the protocol schema, scoring, hashing, credentials, policy checks, tests, and README examples.

Suggested implementation order:

1. Add `schema: 'TSP-2.0'`, `EvidenceClass`, `EvidenceClassBreakdown`, and `TemporalDecay` types.
2. Extend evidence ingestion to accept `evidence_class`, `observed_at`, optional `expires_at`, and optional confidence.
3. Compute evidence-class breakdown globally and per dimension.
4. Compute `raw_score` first, then apply dimension-specific exponential decay to produce final `score`.
5. Include all v2 fields in record and credential hash payloads.
6. Extend policy checks for freshness and observed-evidence requirements.
7. Add explicit migration/import handling for `TSP-1.0` snapshots.
8. Update tests for deterministic decay by injecting or controlling `now`.
9. Update README framing and examples after the implementation is covered by tests.

Recommended test additions:

- Decay leaves fresh scores nearly unchanged.
- Decay moves old scores toward baseline.
- Harm record decays slower than consent and scope evidence.
- Evidence breakdown counts `OBSERVED`, `INFERRED`, and `THEORETICAL` correctly.
- High-stakes policy can reject a high score with insufficient observed evidence.
- Credential verification fails if v2 decay or evidence-class fields are tampered with.
- `TSP-1.0` import either rejects clearly or migrates through an explicit path.

Out of scope for v2: graph reputation propagation, decentralized ledger integration, DID resolution, VC Data Integrity proofs, remote verification APIs, database persistence, UI, or automatic source-protocol fetching. Those can sit above TSP once the core schema is stable.

## 8. RECOMMENDATION

Adopt TSP-2.0 as a focused schema upgrade adding exponential temporal decay and `OBSERVED`/`INFERRED`/`THEORETICAL` evidence breakdowns while preserving the current library-first architecture.
