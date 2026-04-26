/**
 * Trust Score Protocol (TSP-2.0) — portable trust credential generation and verification
 */
import type { TrustCredential, TrustScoreRecord } from './types';
export declare function generateCredential(record: TrustScoreRecord, issuer_id: string, validity_hours?: number): TrustCredential;
export declare function verifyCredential(credential: TrustCredential): boolean;
export declare function isCredentialExpired(credential: TrustCredential): boolean;
//# sourceMappingURL=credential.d.ts.map