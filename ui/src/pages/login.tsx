/**
 * Login Page - Dashboard authentication form
 * Uses shadcn/ui Card and Input components.
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Chrome, Loader2, Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';

export function LoginPage() {
  const { t } = useTranslation();
  const error = null;
  const loading = false;

  const { authRequired, isAuthenticated, startGoogleLogin, googleLoginEnabled } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect destination (default to home)
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  // Redirect if already authenticated or auth not required (via useEffect to avoid render side effects)
  useEffect(() => {
    if (isAuthenticated || !authRequired) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, authRequired, navigate, from]);

  // Show nothing while redirecting
  if (isAuthenticated || !authRequired) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">{t('auth.dashboardTitle')}</CardTitle>
          <CardDescription>{t('auth.loginDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!googleLoginEnabled && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Google login is not available. Check server environment configuration.
              </AlertDescription>
            </Alert>
          )}

          <Button
            type="button"
            className="w-full"
            onClick={startGoogleLogin}
            disabled={loading || !googleLoginEnabled}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('auth.signingIn')}
              </>
            ) : (
              <>
                <Chrome className="mr-2 h-4 w-4" />
                Sign in with Google
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
