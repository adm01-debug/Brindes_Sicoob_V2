import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export function OrderSkeletonCard() {
  return (
    <Card className="overflow-hidden border-border/50">
      <CardContent className="p-0">
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-start">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="pt-2 border-t border-border/50 flex justify-between items-center">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
