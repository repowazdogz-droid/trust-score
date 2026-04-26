/**
 * Trust Score Protocol (TSP-1.0) — hashing and ID generation
 * Uses Node.js crypto only (zero external dependencies).
 */
import type { TrustScoreRecord } from './types';
export declare function sha256(data: string): string;
export declare function chainHash(previousHash: string, payload: string): string;
export declare function generateId(): string;
export declare function recordPayload(r: TrustScoreRecord): string;
//# sourceMappingURL=hash.d.ts.map