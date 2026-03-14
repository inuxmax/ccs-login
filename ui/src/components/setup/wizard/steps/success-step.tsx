/**
 * Success Step
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';
import type { SuccessStepProps } from '../types';

export function SuccessStep({ variantName, onClose }: SuccessStepProps) {
  return (
    <div className="space-y-4 text-center">
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
      </div>
      <div>
        <div className="font-semibold text-lg">Variant Created!</div>
        <div className="text-sm text-muted-foreground">Your custom variant is ready to use</div>
      </div>
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="text-sm text-muted-foreground">Usage:</div>
          <code className="block px-3 py-2 bg-muted rounded-md font-mono text-sm">
            ccs {variantName} "your prompt here"
          </code>
        </CardContent>
      </Card>
      <Button onClick={onClose} className="w-full">
        Done
      </Button>
    </div>
  );
}
