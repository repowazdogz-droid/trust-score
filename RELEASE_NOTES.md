# Release Notes

## 2.0.0 - 2026-04-26

TSP-2.0 schema upgrade for time-aware, evidence-classed trust scoring.

- Added `OBSERVED`, `INFERRED`, and `THEORETICAL` evidence classes.
- Added linear, exponential, and half-life temporal decay support.
- Added raw score, decay-adjusted score, evidence age, and by-class score breakdowns.
- Added record and credential hash coverage for schema, decay, evidence-class, raw-score, and credential-validity fields.
- Added v1 read/migration support: `TSP-1.0` snapshots can be imported and re-emitted as `TSP-2.0`.
- Updated policy checks with optional evidence-class and freshness requirements.
- Rebuilt distributable files from TypeScript source.

## 1.0.1 - 2026-04-26

Release hygiene pass for TSP-1.0.

- Rebuilt distributable files from TypeScript source.
- Verified dependency installation, audit, tests, and build locally.
- Normalised package metadata for npm/GitHub citation.
- Verified MIT license metadata and root LICENSE file.
- Recorded local folder name: trust-score-protocol.
- Recorded GitHub repository: repowazdogz-droid/trust-score.

No protocol schema or runtime semantics were intentionally changed.
