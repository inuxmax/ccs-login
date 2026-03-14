/**
 * Authentication Step
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Check, RefreshCw, ArrowLeft, Terminal, ExternalLink, Loader2 } from 'lucide-react';
import type { AuthStepProps } from '../types';

export function AuthStep({
  selectedProvider,
  providers,
  authCommand,
  isRefreshing,
  isPending,
  onBack,
  onStartAuth,
  onRefresh,
}: AuthStepProps) {
  const [copied, setCopied] = useState(false);

  const copyCommand = async (cmd: string) => {
    await navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Primary: OAuth Button */}
      <div className="text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Authenticate with {providers.find((p) => p.id === selectedProvider)?.name} to add an
          account
        </p>
        <Button onClick={onStartAuth} disabled={isPending} className="w-full gap-2" size="lg">
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Authenticating...
            </>
          ) : (
            <>
              <ExternalLink className="w-4 h-4" />
              Authenticate in Browser
            </>
          )}
        </Button>
        {isPending && (
          <p className="text-xs text-muted-foreground">
            Complete the OAuth flow in your browser...
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or use terminal</span>
        </div>
      </div>

      {/* Secondary: CLI Command */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Terminal className="w-4 h-4" />
            Run this command in your terminal:
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-muted rounded-md font-mono text-sm">
              {authCommand}
            </code>
            <Button variant="outline" size="icon" onClick={() => copyCommand(authCommand)}>
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} disabled={isPending}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button variant="outline" onClick={onRefresh} disabled={isRefreshing || isPending}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Checking...' : 'Refresh Status'}
        </Button>
      </div>
    </div>
  );
}
