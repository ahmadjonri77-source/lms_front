/* JWT payload: {id, full_name, role, iat, exp} — auth.service.ts jwtAccessToken() */

export type TokenPayload = {
  id: number;
  full_name: string;
  role: string;
  iat?: number;
  exp?: number;
};

export function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as TokenPayload;
  } catch {
    return null;
  }
}
