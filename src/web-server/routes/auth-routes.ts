/**
 * Dashboard Authentication Routes
 * Handles login, logout, session check, and setup status.
 */

import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { getDashboardAuthConfig } from '../../config/unified-config-loader';
import { loginRateLimiter } from '../middleware/auth-middleware';
import {
  buildGoogleAuthorizationUrl,
  createGoogleAuthState,
  exchangeGoogleCodeForProfile,
  getGoogleCallbackUrl,
} from '../services/google-auth-service';
import {
  isGoogleDashboardAuthConfigured,
  upsertGoogleDashboardUser,
} from '../services/mongodb-auth-store';

/**
 * Timing-safe string comparison to prevent timing attacks.
 * Returns true if strings match, false otherwise.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still compare to avoid length-based timing leak
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

const router = Router();

function isPasswordAuthConfigured(): boolean {
  const authConfig = getDashboardAuthConfig();
  return Boolean(authConfig.enabled && authConfig.username && authConfig.password_hash);
}

function isAnyDashboardAuthConfigured(): boolean {
  const authConfig = getDashboardAuthConfig();
  return Boolean(
    authConfig.enabled && (isPasswordAuthConfigured() || isGoogleDashboardAuthConfigured())
  );
}

function respondAuthError(res: Response, message: string, status = 500): void {
  res.status(status).send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Google login failed</title>
    <style>
      body { font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
      .card { background:#111827; border:1px solid #334155; border-radius:12px; padding:24px; max-width:520px; box-shadow:0 10px 30px rgba(0,0,0,.35); }
      a { color:#60a5fa; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Google login failed</h1>
      <p>${message}</p>
      <p><a href="/login">Return to login</a></p>
    </div>
  </body>
</html>`);
}

/**
 * POST /api/auth/login
 * Authenticate user with username/password.
 * Rate limited: 5 attempts per 15 minutes.
 */
router.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  const authConfig = getDashboardAuthConfig();

  // Check if password auth is configured
  if (!isPasswordAuthConfigured()) {
    res.status(400).json({ error: 'Password authentication not configured' });
    return;
  }

  // Validate bcrypt hash format to prevent bcrypt.compare errors
  const isBcryptHash = /^\$2[aby]?\$\d{2}\$.{53}$/.test(authConfig.password_hash);
  if (!isBcryptHash) {
    res.status(500).json({ error: 'Invalid password hash format in config' });
    return;
  }

  // Verify credentials (timing-safe comparison for username)
  const usernameMatch = timingSafeEqual(username, authConfig.username);
  const passwordMatch = await bcrypt.compare(password, authConfig.password_hash);

  if (!usernameMatch || !passwordMatch) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  // Regenerate session to prevent session fixation, then set auth
  req.session.regenerate((err) => {
    if (err) {
      res.status(500).json({ error: 'Session error' });
      return;
    }
    req.session.authenticated = true;
    req.session.username = username;
    res.json({ success: true, username });
  });
});

/**
 * POST /api/auth/logout
 * Clear session and log out user.
 */
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to logout' });
      return;
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

/**
 * GET /api/auth/check
 * Check if user is authenticated and if auth is required.
 */
router.get('/google', (req: Request, res: Response) => {
  const authConfig = getDashboardAuthConfig();
  if (!authConfig.enabled) {
    res.status(400).json({ error: 'Dashboard authentication is disabled' });
    return;
  }

  if (!isGoogleDashboardAuthConfigured()) {
    res.status(500).json({ error: 'Google authentication is not configured' });
    return;
  }

  const state = createGoogleAuthState();
  req.session.googleOAuthState = state;
  res.redirect(buildGoogleAuthorizationUrl(state));
});

router.get('/google/callback', async (req: Request, res: Response) => {
  const authConfig = getDashboardAuthConfig();
  if (!authConfig.enabled) {
    respondAuthError(res, 'Dashboard authentication is disabled.', 400);
    return;
  }

  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const expectedState = req.session.googleOAuthState;

  if (!code || !state || !expectedState || state !== expectedState) {
    respondAuthError(res, 'Invalid or expired Google OAuth state.', 400);
    return;
  }

  delete req.session.googleOAuthState;

  try {
    const profile = await exchangeGoogleCodeForProfile(code);
    const user = await upsertGoogleDashboardUser(profile);

    req.session.regenerate((err) => {
      if (err) {
        respondAuthError(res, 'Session error during Google login.');
        return;
      }

      req.session.authenticated = true;
      req.session.username = user.email;
      req.session.role = user.role;
      req.session.authProvider = 'google';
      req.session.userEmail = user.email;
      req.session.displayName = user.name;
      req.session.picture = user.picture;
      res.redirect('/');
    });
  } catch (error) {
    respondAuthError(res, (error as Error).message);
  }
});

router.get('/check', (req: Request, res: Response) => {
  const authConfig = getDashboardAuthConfig();

  res.json({
    authRequired: authConfig.enabled,
    authenticated: req.session?.authenticated ?? false,
    username: req.session?.username ?? null,
    role: req.session?.role ?? null,
    authProvider: req.session?.authProvider ?? null,
    displayName: req.session?.displayName ?? null,
    picture: req.session?.picture ?? null,
    googleLoginEnabled: Boolean(authConfig.enabled && isGoogleDashboardAuthConfigured()),
    googleCallbackUrl: getGoogleCallbackUrl(),
  });
});

/**
 * GET /api/auth/setup
 * Check if authentication is properly configured.
 */
router.get('/setup', (_req: Request, res: Response) => {
  const authConfig = getDashboardAuthConfig();

  res.json({
    enabled: authConfig.enabled,
    configured: isAnyDashboardAuthConfigured(),
    passwordConfigured: isPasswordAuthConfigured(),
    googleConfigured: isGoogleDashboardAuthConfigured(),
    sessionTimeoutHours: authConfig.session_timeout_hours ?? 24,
  });
});

export default router;
