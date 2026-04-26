"use strict";
/**
 * Trust Score Protocol (TSP-2.0)
 * Portable, time-aware, verifiable trust scores for agents and decision-makers.
 * Zero external dependencies (Node.js crypto only).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordPayload = exports.generateId = exports.chainHash = exports.sha256 = exports.scoreToLevel = exports.DEFAULT_DIMENSION_HALF_LIFE_HOURS = exports.DIMENSION_WEIGHTS = exports.evidenceCountToConfidence = exports.evidenceClassBreakdown = exports.defaultDecayFunction = exports.decayMultiplier = exports.buildTemporalDecay = exports.buildScoreBreakdown = exports.computeDimensionScores = exports.verifyCredential = exports.generateCredential = exports.overallConfidence = exports.calculateScore = exports.isCredentialExpired = exports.TrustScore = exports.schema = exports.legacySchema = void 0;
var types_1 = require("./types");
Object.defineProperty(exports, "legacySchema", { enumerable: true, get: function () { return types_1.legacySchema; } });
Object.defineProperty(exports, "schema", { enumerable: true, get: function () { return types_1.schema; } });
var trust_score_1 = require("./trust-score");
Object.defineProperty(exports, "TrustScore", { enumerable: true, get: function () { return trust_score_1.TrustScore; } });
Object.defineProperty(exports, "isCredentialExpired", { enumerable: true, get: function () { return trust_score_1.isCredentialExpired; } });
var calculator_1 = require("./calculator");
Object.defineProperty(exports, "calculateScore", { enumerable: true, get: function () { return calculator_1.calculateScore; } });
Object.defineProperty(exports, "overallConfidence", { enumerable: true, get: function () { return calculator_1.overallConfidence; } });
var credential_1 = require("./credential");
Object.defineProperty(exports, "generateCredential", { enumerable: true, get: function () { return credential_1.generateCredential; } });
Object.defineProperty(exports, "verifyCredential", { enumerable: true, get: function () { return credential_1.verifyCredential; } });
var dimensions_1 = require("./dimensions");
Object.defineProperty(exports, "computeDimensionScores", { enumerable: true, get: function () { return dimensions_1.computeDimensionScores; } });
Object.defineProperty(exports, "buildScoreBreakdown", { enumerable: true, get: function () { return dimensions_1.buildScoreBreakdown; } });
Object.defineProperty(exports, "buildTemporalDecay", { enumerable: true, get: function () { return dimensions_1.buildTemporalDecay; } });
Object.defineProperty(exports, "decayMultiplier", { enumerable: true, get: function () { return dimensions_1.decayMultiplier; } });
Object.defineProperty(exports, "defaultDecayFunction", { enumerable: true, get: function () { return dimensions_1.defaultDecayFunction; } });
Object.defineProperty(exports, "evidenceClassBreakdown", { enumerable: true, get: function () { return dimensions_1.evidenceClassBreakdown; } });
Object.defineProperty(exports, "evidenceCountToConfidence", { enumerable: true, get: function () { return dimensions_1.evidenceCountToConfidence; } });
Object.defineProperty(exports, "DIMENSION_WEIGHTS", { enumerable: true, get: function () { return dimensions_1.DIMENSION_WEIGHTS; } });
Object.defineProperty(exports, "DEFAULT_DIMENSION_HALF_LIFE_HOURS", { enumerable: true, get: function () { return dimensions_1.DEFAULT_DIMENSION_HALF_LIFE_HOURS; } });
Object.defineProperty(exports, "scoreToLevel", { enumerable: true, get: function () { return dimensions_1.scoreToLevel; } });
var hash_1 = require("./hash");
Object.defineProperty(exports, "sha256", { enumerable: true, get: function () { return hash_1.sha256; } });
Object.defineProperty(exports, "chainHash", { enumerable: true, get: function () { return hash_1.chainHash; } });
Object.defineProperty(exports, "generateId", { enumerable: true, get: function () { return hash_1.generateId; } });
Object.defineProperty(exports, "recordPayload", { enumerable: true, get: function () { return hash_1.recordPayload; } });
