export type Role = "OWNER" | "MANAGER" | "STAFF";

export interface JwtClaims {
  userId: string;
  tenantId: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtClaims;
    }
  }
}
