/**
 * Dashboard Authentication Middleware
 * Session-based auth with httpOnly cookies for CCS dashboard.
 */

import type { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import { getDashboardAuthConfig } from '../../config/unified-config-loader';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getCcsDir } from '../../utils/config-manager';

// Extend Express Request with session
declare module 'express-session' {
  interface SessionData {
    authenticated: boolean;
    username: string;
    role?: 'admin';
    authProvider?: 'google' | 'password';
    userEmail?: string;
    displayName?: string;
    picture?: string;
    googleOAuthState?: string;
  }
}

/** Public paths that bypass auth (lowercase for case-insensitive matching) */
const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/check',
  '/api/auth/setup',
  '/api/auth/google',
  '/api/auth/google/callback',
  '/api/health',
];

const CONTROL_API_PATH_PREFIXES = ['/api/cliproxy', '/api/cliproxy-server'];

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function getControlApiSecret(): string | null {
  const secret = process.env.CONTROL_API_SECRET?.trim();
  return secret ? secret : null;
}

function getControlApiPresentedSecret(req: Request): string | null {
  const headerSecret = req.get('x-management-secret')?.trim();
  if (headerSecret) {
    return headerSecret;
  }

  const authorization = req.get('authorization')?.trim() ?? '';
  if (/^bearer\s+/i.test(authorization)) {
    const token = authorization.replace(/^bearer\s+/i, '').trim();
    return token ? token : null;
  }

  return null;
}

function hasValidControlApiSecret(req: Request): boolean {
  const expected = getControlApiSecret();
  if (!expected) return false;

  const presented = getControlApiPresentedSecret(req);
  if (!presented) return false;

  return timingSafeEqual(presented, expected);
}

/** Path to persistent session secret file */
function getSessionSecretPath() {
  return path.join(getCcsDir(), '.session-secret');
}

/**
 * Generate or retrieve persistent session secret.
 * Priority: ENV var > persisted file > generate new
 */
function getSessionSecret(): string {
  // 1. Check ENV var first
  if (process.env.CCS_SESSION_SECRET) {
    return process.env.CCS_SESSION_SECRET;
  }

  const secretPath = getSessionSecretPath();

  // 2. Try to read persisted secret
  try {
    if (fs.existsSync(secretPath)) {
      const secret = fs.readFileSync(secretPath, 'utf-8').trim();
      if (secret.length >= 32) {
        return secret;
      }
    }
  } catch {
    // Ignore read errors, generate new secret
  }

  // 3. Generate and persist new random secret
  const newSecret = crypto.randomBytes(32).toString('hex');
  try {
    const dir = path.dirname(secretPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(secretPath, newSecret, { mode: 0o600 });
  } catch (err) {
    // Log warning - sessions won't persist across restarts
    console.warn('[!] Failed to persist session secret:', (err as Error).message);
  }

  return newSecret;
}

/**
 * Rate limiter for login attempts.
 * 5 attempts per 15 minutes per IP.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !getDashboardAuthConfig().enabled,
});

/**
 * Create session middleware configured for CCS dashboard.
 */
export function createSessionMiddleware() {
  const authConfig = getDashboardAuthConfig();
  const maxAge = (authConfig.session_timeout_hours ?? 24) * 60 * 60 * 1000;

  return session({
    secret: getSessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Local CLI uses HTTP
      httpOnly: true,
      maxAge,
      sameSite: 'lax',
    },
  });
}

/**
 * Auth middleware that protects all routes except public paths.
 * Only active when dashboard_auth.enabled = true.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authConfig = getDashboardAuthConfig();

  // Skip auth if disabled
  if (!authConfig.enabled) {
    return next();
  }

  // Allow public paths (case-insensitive)
  const pathLower = req.path.toLowerCase();
  if (PUBLIC_PATHS.some((p) => pathLower.startsWith(p))) {
    return next();
  }

  if (
    req.path.startsWith('/api/') &&
    CONTROL_API_PATH_PREFIXES.some((p) => pathLower.startsWith(p)) &&
    hasValidControlApiSecret(req)
  ) {
    return next();
  }

  // Allow static assets and SPA routes (non-API)
  if (!req.path.startsWith('/api/')) {
    return next();
  }

  // Check session
  if (req.session?.authenticated) {
    return next();
  }

  // Unauthorized
  res.status(401).json({ error: 'Authentication required' });
}
