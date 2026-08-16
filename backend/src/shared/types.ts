export type Role = "OWNER" | "MANAGER" | "STAFF";

export interface JwtClaims {
  userId: string;
  tenantId: string;
  role: Role;
}

export interface AdminJwtClaims {
  adminId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtClaims;
      admin?: AdminJwtClaims;
    }
  }
}
