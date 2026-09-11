import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export type UserRole = 'owner' | 'staff';

export interface JwtPayload {
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

function getPasswordConfig(primaryName: string, legacyName: string, fallback: string): string {
  return process.env[primaryName] || process.env[legacyName] || fallback;
}

export const JWT_SECRET = process.env.JWT_SECRET || 'bake-and-brew-jwt-secret-key-prod-2026';

export function getOwnerPasswordConfig(): string {
  return getPasswordConfig('OWNER_PASSWORD', 'OWNER_PASSWORD_HASH', 'owner123');
}

export function getStaffPasswordConfig(): string {
  return getPasswordConfig('STAFF_PASSWORD', 'STAFF_PASSWORD_HASH', 'staff123');
}

function normalizeConfiguredPassword(value: string): string {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function verifyPasswordMatch(password: string, envVal: string): Promise<boolean> {
  envVal = normalizeConfiguredPassword(envVal);

  // 1. If user set plain text in environment variable
  if (envVal && password === envVal) {
    return true;
  }

  // 2. If user set a bcrypt hash in environment variable
  if (envVal && (envVal.startsWith('$2a$') || envVal.startsWith('$2b$') || envVal.startsWith('$2y$'))) {
    try {
      if (await bcrypt.compare(password, envVal)) {
        return true;
      }
    } catch {
      // ignore comparison error
    }
  }

  return false;
}

/**
 * Authenticates input password against OWNER_PASSWORD_HASH, then STAFF_PASSWORD_HASH.
 * Returns JWT and role if matched, or throws generic error if neither matches.
 */
export async function authenticatePassword(password: string): Promise<{ token: string; role: UserRole }> {
  if (!password || typeof password !== 'string') {
    throw new Error('Invalid password');
  }

  const ownerConfig = getOwnerPasswordConfig();
  const staffConfig = getStaffPasswordConfig();

  // 1. Check Owner
  const isOwner = await verifyPasswordMatch(password, ownerConfig);
  if (isOwner) {
    const token = jwt.sign({ role: 'owner' }, JWT_SECRET, { expiresIn: '8h' });
    return { token, role: 'owner' };
  }

  // 2. Check Staff
  const isStaff = await verifyPasswordMatch(password, staffConfig);
  if (isStaff) {
    const token = jwt.sign({ role: 'staff' }, JWT_SECRET, { expiresIn: '8h' });
    return { token, role: 'staff' };
  }

  // 3. Neither matched: generic error (do NOT reveal which check failed)
  throw new Error('Invalid password');
}

/**
 * Extracts and verifies JWT from cookie or Authorization header
 */
export function verifyToken(req: Request): JwtPayload | null {
  let token: string | undefined;

  // 1. Check cookie
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // 2. Check Authorization header
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Express middleware: requires valid authentication
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const user = verifyToken(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized. Please log in.' });
    return;
  }
  req.user = user;
  next();
}

/**
 * Express middleware: requires Owner role.
 * Staff will receive 403 Forbidden.
 */
export function requireOwner(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const user = verifyToken(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized. Please log in.' });
    return;
  }
  if (user.role !== 'owner') {
    res.status(403).json({ error: 'Forbidden. Owner privileges required.' });
    return;
  }
  req.user = user;
  next();
}

/**
 * Express middleware: requires Staff role.
 * Owner will receive 403 Forbidden (billing is staff-only).
 */
export function requireStaff(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const user = verifyToken(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized. Please log in.' });
    return;
  }
  if (user.role !== 'staff') {
    res.status(403).json({ error: 'Forbidden. Staff access required. Owner does not have billing permissions.' });
    return;
  }
  req.user = user;
  next();
}
