import crypto from 'crypto';

export interface GoogleDashboardProfile {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
  id_token?: string;
}

interface GoogleUserInfoResponse {
  id: string;
  email: string;
  verified_email?: boolean;
  name?: string;
  picture?: string;
}

const GOOGLE_AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GOOGLE_SCOPE = 'openid email profile';

function getRequiredEnv(name: 'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET'): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function getGoogleCallbackUrl(): string {
  return (
    process.env.GOOGLE_CALLBACK_URL?.trim() || 'http://localhost:3000/api/auth/google/callback'
  );
}

export function createGoogleAuthState(): string {
  return crypto.randomBytes(24).toString('hex');
}

export function buildGoogleAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getRequiredEnv('GOOGLE_CLIENT_ID'),
    redirect_uri: getGoogleCallbackUrl(),
    response_type: 'code',
    scope: GOOGLE_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `${GOOGLE_AUTH_BASE}?${params.toString()}`;
}

export async function exchangeGoogleCodeForProfile(code: string): Promise<GoogleDashboardProfile> {
  const body = new URLSearchParams({
    code,
    client_id: getRequiredEnv('GOOGLE_CLIENT_ID'),
    client_secret: getRequiredEnv('GOOGLE_CLIENT_SECRET'),
    redirect_uri: getGoogleCallbackUrl(),
    grant_type: 'authorization_code',
  });

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Google token exchange failed: ${errorText || tokenResponse.statusText}`);
  }

  const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;
  if (!tokenData.access_token) {
    throw new Error('Google token exchange did not return an access token');
  }

  const userResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userResponse.ok) {
    const errorText = await userResponse.text();
    throw new Error(`Google userinfo lookup failed: ${errorText || userResponse.statusText}`);
  }

  const userInfo = (await userResponse.json()) as GoogleUserInfoResponse;
  if (!userInfo.id || !userInfo.email) {
    throw new Error('Google user info is missing required fields');
  }

  return {
    googleId: userInfo.id,
    email: userInfo.email,
    name: userInfo.name || userInfo.email,
    picture: userInfo.picture,
  };
}
