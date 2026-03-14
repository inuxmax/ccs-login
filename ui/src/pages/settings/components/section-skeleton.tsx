/**
 * Section Skeleton Component
 * Loading placeholder for lazy-loaded settings sections
 */

import { Skeleton } from '@/components/ui/skeleton';

export function SectionSkeleton() {
  return (
    <div className="flex-1 p-5 space-y-6">
      <Skeleton className="h-4 w-2/3" />
      <div className="p-4 rounded-lg border">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-6 w-10 rounded-full" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
