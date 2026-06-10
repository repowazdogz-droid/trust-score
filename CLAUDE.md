# trust-score-protocol

Follow `/Users/warre/Omega/CLAUDE.md` (UNIFIED + FORGE goal contract required before work).

## PURPOSE
TSP-2.0 implementation. Portable, time-aware, evidence-classed trust scores for agents and humans. Aggregates evidence from across the Omega trust stack (clearpath `ClearpathSummary`, cognitive-ledger `ReasoningProfile`, consent-ledger `ConsentRecord`, harm-trace `HarmRecord`) into a multi-dimensional profile across 8 dimensions (accuracy, consistency, transparency, consent_compliance, harm_record, bias_awareness, calibration, scope_adherence), applies temporal decay (linear, exponential, half-life) so stale evidence drifts toward neutral, breaks support down by evidence class (`OBSERVED` / `INFERRED` / `THEORETICAL`), issues time-limited cryptographically verifiable `TrustCredential`s, and checks credentials against verifier-defined `TrustPolicy`. Scores are decision aids for policy, not universal trust declarations.

## STATUS
live. v2.0.0 (TSP-2.0: temporal decay + evidence classes) released 2026-04-26 per `RELEASE_NOTES.md`. Backward-compatible read for TSP-1.0 snapshots.

## STACK
- Language: TypeScript 5.3 strict, `target: ES2020`, `module: commonjs` (`tsconfig.json`).
- Runtime: Node.js only (uses `crypto`; zero non-Node external deps in `src/`).
- Tests: jest 29 + ts-jest, config `jest.config.js` (`tests/**/*.test.ts`).
- Build: `tsc` → `dist/`. Output checked in (`dist/` shipped via `files`).

## ENTRY POINTS
- `src/index.ts` — public API. Re-exports `TrustScore`, `isCredentialExpired`, `calculateScore`, `overallConfidence`, `generateCredential`, `verifyCredential`, dimension helpers (`computeDimensionScores`, `buildScoreBreakdown`, `buildTemporalDecay`, `decayMultiplier`, `defaultDecayFunction`, `evidenceClassBreakdown`, `evidenceCountToConfidence`, `DIMENSION_WEIGHTS`, `DEFAULT_DIMENSION_HALF_LIFE_HOURS`, `scoreToLevel`), hash helpers, and types/schema (`schema`, `legacySchema`).
- `src/trust-score.ts` — main `TrustScore` class.
- `src/calculator.ts` — score + confidence math.
- `src/credential.ts` — `generateCredential` / `verifyCredential`.
- `src/dimensions.ts` — dimension weights, decay functions, evidence-class breakdown, score → level mapping.
- `src/types.ts` — schema + v1 legacy schema + cross-protocol input types (`ClearpathSummary`, `CognitiveProfile`, `ConsentRecord`, `HarmRecord`).
- Built artefact: `dist/index.js` / `dist/index.d.ts`.
- No CLI.

## CONVENTIONS
- Single flat `src/`.
- Single test file `tests/trust-score.test.ts`.
- `DIMENSION_WEIGHTS` and `DEFAULT_DIMENSION_HALF_LIFE_HOURS` are exported constants — protocol semantics, not config knobs; change deliberately.
- Cross-protocol inputs are typed structurally (`ClearpathSummary`, `CognitiveProfile`, `ConsentRecord`, `HarmRecord`) — TSP does **not** runtime-depend on the other protocol packages, it accepts their summary shapes. Keep these types in sync with the sibling protocols when their adapter outputs change.
- Credentials are time-limited and must be regenerated from current evidence on expiry — `isCredentialExpired` is the public freshness check.
- Policies can require minimum evidence class (`OBSERVED` > `INFERRED` > `THEORETICAL`) and freshness — high-stakes policies should not rely on `THEORETICAL` alone (README).
- High scores must not grant autonomy by themselves — README explicitly warns against this; preserve.

## DEPENDENCIES
- Internal: none declared in `package.json`. No `@omega-protocol/contracts` peer dep, no adapter.ts. Coupling to other protocols is via structural input types only. Inventory says it connects to clearpath / cognitive-ledger / consent-ledger / harm-trace / omega-contracts — needs Warren to confirm whether a contracts adapter is intended.
- External runtime: none.
- External dev: `jest`, `ts-jest`, `typescript`.
- Package name is `trust-score` (bare); repo dir `trust-score-protocol`; GitHub remote `repowazdogz-droid/trust-score`.

## GOTCHAS
- Inputs are structural — if clearpath / cognitive-ledger / consent-ledger / harm-trace change their summary shapes (e.g. via their `toOmegaEvidence` / `toAuthorityEvidence` / etc. adapters), the input types here can silently drift. No conformance test against `@omega-protocol/contracts` fixtures.
- TSP-1.0 snapshots are still readable; v2 emits the new schema. Don't drop legacy without a deprecation pass.
- Decay functions: `linear` / `exponential` / `half-life` are not interchangeable — credential consumers must know which one was applied (it's recorded in the score breakdown).
- `dist/` committed; rebuild before tag.
- Single test file across calculator, credential, dimensions, trust-score.
- No CI workflow in tree (`.github/` absent).
- Repo dir vs package-name divergence (`trust-score-protocol` vs `trust-score`).

## LAST UPDATED
2026-05-26
