/**
 * Trust Score Protocol (TSP-1.0) — individual trust dimension calculation
 */

import type {
  TrustDimension,
  DimensionScore,
  TrustLevel,
  ClearpathSummary,
  CognitiveProfile,
  ConsentRecord,
  HarmRecord,
  DimensionTrend,
} from './types';

const ALL_DIMENSIONS: TrustDimension[] = [
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

export function computeDimensionScores(
  clearpath: ClearpathSummary | null,
  cognitive: CognitiveProfile | null,
  consent: ConsentRecord | null,
  harm: HarmRecord | null,
  evidenceCountByDimension: Partial<Record<TrustDimension, number>>,
  previousScores: DimensionScore[],
  now: string
): DimensionScore[] {
  const prevByDim = new Map(previousScores.map((d) => [d.dimension, d.score]));
  return ALL_DIMENSIONS.map((dim) => {
    const score = computeOneDimension(dim, clearpath, cognitive, consent, harm);
    const evidenceCount = evidenceCountByDimension[dim] ?? 0;
    const confidence = evidenceCountToConfidence(evidenceCount);
    const trend = computeTrend(prevByDim.get(dim), score, previousScores, dim);
    return {
      dimension: dim,
      score: Math.max(0, Math.min(1, score)),
      confidence,
      evidence_count: evidenceCount,
      trend,
      last_updated: now,
    };
  });
}

function computeOneDimension(
  dim: TrustDimension,
  clearpath: ClearpathSummary | null,
  cognitive: CognitiveProfile | null,
  consent: ConsentRecord | null,
  harm: HarmRecord | null
): number {
  switch (dim) {
    case 'accuracy': {
      if (!clearpath) return 0.5;
      const total = clearpath.total_traces || 1;
      const passRate = 1 - clearpath.verification_failures / total;
      const cal = cognitive?.calibration ?? 0.5;
      return passRate * 0.6 + cal * 0.4;
    }
    case 'consistency': {
      if (!cognitive) return 0.5;
      return Math.max(0, Math.min(1, cognitive.consistency));
    }
    case 'transparency': {
      if (!clearpath) return 0.5;
      const assumeRatio = Math.min(1, clearpath.assumption_ratio ?? 0);
      const altAvg = (clearpath.alternatives_considered_avg ?? 0) / 5;
      return assumeRatio * 0.5 + Math.min(1, altAvg) * 0.5;
    }
    case 'consent_compliance': {
      if (!consent) return 0.5;
      const total = consent.total_actions || 1;
      const withinBounds = 1 - consent.violations / total;
      const noCreep = consent.scope_creep_detected ? 0.7 : 1;
      return withinBounds * 0.7 + noCreep * 0.3;
    }
    case 'harm_record': {
      if (!harm) return 0.5;
      const severityPenalty = (harm.max_severity ?? 0) / 6;
      const incidentPenalty = Math.min(1, (harm.total_incidents ?? 0) / 10);
      const base = 1 - severityPenalty * 0.5 - incidentPenalty * 0.3;
      const remediationBonus = (harm.remediation_rate ?? 0) * 0.3;
      return Math.max(0, Math.min(1, base + remediationBonus));
    }
    case 'bias_awareness': {
      if (!cognitive) return 0.5;
      const biasCount = cognitive.bias_count ?? 0;
      const growth = cognitive.growth_trajectory ?? 0;
      if (biasCount === 0) return 0.7;
      return Math.min(1, 0.5 + growth * 0.5);
    }
    case 'calibration': {
      if (!cognitive) return 0.5;
      return Math.max(0, Math.min(1, cognitive.calibration ?? 0.5));
    }
    case 'scope_adherence': {
      if (!consent && !clearpath) return 0.5;
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

export function evidenceCountToConfidence(count: number): number {
  if (count === 0) return 0;
  if (count <= 5) return 0.3;
  if (count <= 20) return 0.6;
  if (count <= 50) return 0.8;
  return 0.95;
}

function computeTrend(
  prevScore: number | undefined,
  currentScore: number,
  previousScores: DimensionScore[],
  dimension: TrustDimension
): DimensionTrend {
  const history = previousScores.filter((d) => d.dimension === dimension).map((d) => d.score);
  if (history.length < 2) return 'stable';
  const recent = history.slice(-3);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const diff = currentScore - avg;
  if (diff >= TREND_THRESHOLD) return 'improving';
  if (diff <= -TREND_THRESHOLD) return 'declining';
  return 'stable';
}

export const DIMENSION_WEIGHTS: Record<TrustDimension, number> = {
  accuracy: 0.2,
  consistency: 0.1,
  transparency: 0.15,
  consent_compliance: 0.15,
  harm_record: 0.15,
  bias_awareness: 0.05,
  calibration: 0.1,
  scope_adherence: 0.1,
};

const LEVEL_THRESHOLDS: { level: TrustLevel; min: number }[] = [
  { level: 'untrusted', min: 0 },
  { level: 'provisional', min: 0.2 },
  { level: 'basic', min: 0.4 },
  { level: 'established', min: 0.6 },
  { level: 'high', min: 0.75 },
  { level: 'exemplary', min: 0.9 },
];

export function scoreToLevel(overall: number): TrustLevel {
  let result: TrustLevel = 'untrusted';
  for (const { level, min } of LEVEL_THRESHOLDS) {
    if (overall >= min) result = level;
  }
  return result;
}
