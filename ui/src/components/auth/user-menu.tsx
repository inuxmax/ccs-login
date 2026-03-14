/**
 * User Menu - Header component showing username and logout button
 * Only renders when auth is enabled and user is authenticated.
 */

import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, ShieldCheck } from 'lucide-react';

export function UserMenu() {
  const { authRequired, isAuthenticated, username, displayName, role, authProvider, logout } =
    useAuth();

  // Only show when auth is enabled and user is logged in
  if (!authRequired || !isAuthenticated) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          {role === 'admin' ? <ShieldCheck className="h-4 w-4" /> : <User className="h-4 w-4" />}
          <span className="hidden sm:inline">{displayName || username}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled className="gap-2 opacity-100">
          {role === 'admin' ? <ShieldCheck className="h-4 w-4" /> : <User className="h-4 w-4" />}
          {role === 'admin' ? 'Admin session' : 'Authenticated session'}
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="opacity-100 text-muted-foreground">
          {authProvider === 'google' ? 'Provider: Google' : 'Provider: Password'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive">
          <LogOut className="h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
