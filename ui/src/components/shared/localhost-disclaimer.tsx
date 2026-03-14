import { Shield, X } from 'lucide-react';
import { useState } from 'react';

export function LocalhostDisclaimer() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="w-full bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800 px-4 py-2 transition-colors duration-200">
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
          <Shield className="w-4 h-4 flex-shrink-0" />
          <span className="hidden sm:inline">
            This dashboard runs locally. All data stays on your machine.
          </span>
          <span className="sm:hidden">Local dashboard - data stays on your device.</span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 flex-shrink-0 p-1 rounded hover:bg-yellow-100 dark:hover:bg-yellow-800/30 transition-colors"
          aria-label="Dismiss disclaimer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
