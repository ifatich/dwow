"use client";

/** Primitive bar dengan animasi pulse */
export function SkeletonBar({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-surface-soft/80 rounded animate-pulse ${className}`} />
  );
}

/** Dashboard Full Page Skeleton */
export function DashboardSkeleton() {
  return (
    <div className="max-w-[1280px] mx-auto px-xl py-xxl w-full space-y-xxl">
      {/* Hero Section */}
      <div className="space-y-sm">
        <SkeletonBar className="h-4 w-28 rounded-pill" />
        <SkeletonBar className="h-12 w-80 max-w-full rounded-md" />
        <SkeletonBar className="h-4 w-96 max-w-full" />
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-canvas rounded-lg p-lg border border-hairline shadow-xs space-y-sm">
            <SkeletonBar className="h-3 w-20" />
            <SkeletonBar className="h-9 w-16" />
            <SkeletonBar className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Project Cards Section */}
      <div className="space-y-md">
        <div className="flex items-center justify-between">
          <SkeletonBar className="h-6 w-44" />
          <SkeletonBar className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          {[1, 2, 3].map((p) => (
            <div key={p} className="bg-canvas border border-hairline rounded-lg p-xl space-y-md">
              <div className="flex justify-between items-center">
                <SkeletonBar className="h-4 w-20 rounded-pill" />
                <SkeletonBar className="h-4 w-14 rounded-pill" />
              </div>
              <SkeletonBar className="h-6 w-3/4" />
              <SkeletonBar className="h-4 w-full" />
              <SkeletonBar className="h-4 w-5/6" />
              <div className="pt-sm space-y-xs">
                <SkeletonBar className="h-3 w-full" />
                <SkeletonBar className="h-2 w-full rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg pt-md">
        <div className="bg-canvas border border-hairline rounded-lg p-lg space-y-md">
          <SkeletonBar className="h-5 w-40" />
          <SkeletonBar className="h-48 w-full rounded-md" />
        </div>
        <div className="bg-canvas border border-hairline rounded-lg p-lg space-y-md">
          <SkeletonBar className="h-5 w-40" />
          <SkeletonBar className="h-48 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

/** Project Progress Summary Skeleton */
export function ProjectProgressSummarySkeleton() {
  return (
    <div className="bg-canvas border border-hairline rounded-lg p-lg mb-lg shadow-xs space-y-md">
      <div className="flex items-center justify-between border-b border-hairline-soft pb-sm">
        <SkeletonBar className="h-5 w-48" />
        <SkeletonBar className="h-6 w-24 rounded-pill" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        <div className="bg-surface-soft/40 border border-hairline-soft rounded-md p-md space-y-xs">
          <SkeletonBar className="h-4 w-32" />
          <SkeletonBar className="h-3 w-full rounded-full" />
          <SkeletonBar className="h-3 w-44" />
        </div>
        <div className="bg-surface-soft/40 border border-hairline-soft rounded-md p-md space-y-xs">
          <SkeletonBar className="h-4 w-32" />
          <SkeletonBar className="h-3 w-full rounded-full" />
          <SkeletonBar className="h-3 w-44" />
        </div>
      </div>
    </div>
  );
}

/** Kanban Columns Skeleton */
export function KanbanSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="space-y-lg w-full">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-md">
        <SkeletonBar className="h-10 w-64 rounded-md" />
        <SkeletonBar className="h-10 w-36 rounded-md" />
      </div>

      {/* Board columns */}
      <div className="flex gap-lg items-start overflow-x-auto pb-lg">
        {Array.from({ length: cols }).map((_, c) => (
          <div key={c} className="flex-1 min-w-[260px] bg-surface-soft/30 border border-hairline-soft rounded-lg overflow-hidden">
            <div className="p-md bg-surface-soft/60 border-b border-hairline-soft flex justify-between items-center">
              <SkeletonBar className="h-5 w-24" />
              <SkeletonBar className="h-5 w-6 rounded-full" />
            </div>
            <div className="p-sm space-y-sm min-h-[280px]">
              {[1, 2].map((card) => (
                <div key={card} className="bg-canvas border border-hairline rounded-md p-md space-y-sm shadow-xs">
                  <SkeletonBar className="h-4 w-5/6" />
                  <SkeletonBar className="h-3 w-1/2" />
                  <div className="flex justify-between items-center pt-xs">
                    <SkeletonBar className="h-5 w-16 rounded-pill" />
                    <SkeletonBar className="h-5 w-12 rounded-pill" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Task Detail Full Page Skeleton */
export function TaskDetailSkeleton() {
  return (
    <div className="max-w-[1280px] mx-auto px-xl py-xxl w-full space-y-xxl">
      {/* Header & Badges */}
      <div className="space-y-sm">
        <div className="flex items-center gap-sm">
          <SkeletonBar className="h-6 w-20 rounded-pill" />
          <SkeletonBar className="h-6 w-24 rounded-pill" />
        </div>
        <SkeletonBar className="h-10 w-2/3 max-w-full rounded-md" />
        <div className="flex items-center gap-md text-ink/40">
          <SkeletonBar className="h-4 w-32" />
          <SkeletonBar className="h-4 w-32" />
        </div>
      </div>

      {/* Metadata Collapsible Section */}
      <div className="bg-surface-soft/30 border border-hairline-soft rounded-lg p-lg space-y-md">
        <SkeletonBar className="h-5 w-32" />
        <SkeletonBar className="h-4 w-full" />
        <SkeletonBar className="h-4 w-4/5" />
      </div>

      {/* Subtask Kanban */}
      <KanbanSkeleton cols={4} />

      {/* Activity Feed */}
      <div className="bg-surface-soft/30 border border-hairline-soft rounded-lg p-lg space-y-md">
        <SkeletonBar className="h-5 w-36" />
        <SkeletonBar className="h-12 w-full" />
        <SkeletonBar className="h-12 w-full" />
      </div>
    </div>
  );
}

/** Sprint History Page Skeleton */
export function SprintHistorySkeleton() {
  return (
    <div className="space-y-lg w-full">
      <div className="space-y-sm mb-lg">
        <SkeletonBar className="h-4 w-32" />
        <SkeletonBar className="h-10 w-64" />
      </div>
      {[1, 2, 3].map((s) => (
        <div key={s} className="bg-canvas border border-hairline rounded-lg p-lg space-y-md">
          <div className="flex justify-between items-center border-b border-hairline-soft pb-sm">
            <SkeletonBar className="h-6 w-36" />
            <SkeletonBar className="h-4 w-24" />
          </div>
          <div className="space-y-sm">
            <SkeletonBar className="h-4 w-full" />
            <SkeletonBar className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Activity History Page Skeleton */
export function ActivityHistorySkeleton() {
  return (
    <div className="space-y-lg w-full">
      <div className="flex gap-sm flex-wrap">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonBar key={i} className="h-8 w-24 rounded-pill" />
        ))}
      </div>
      <div className="bg-canvas border border-hairline rounded-lg overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-md border-b border-hairline-soft flex items-center gap-md">
            <SkeletonBar className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-xs">
              <SkeletonBar className="h-4 w-1/3" />
              <SkeletonBar className="h-3 w-1/4" />
            </div>
            <SkeletonBar className="h-5 w-20 rounded-pill" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Individual Metrics Skeleton */
export function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-md w-full">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-surface-soft/40 rounded-lg border border-hairline-soft p-lg space-y-md">
          <div className="flex items-center gap-md">
            <SkeletonBar className="w-10 h-10 rounded-full" />
            <div className="space-y-xs flex-1">
              <SkeletonBar className="h-5 w-32" />
              <SkeletonBar className="h-3 w-24" />
            </div>
            <SkeletonBar className="h-6 w-12 rounded-pill" />
          </div>
          <div className="space-y-xs">
            <SkeletonBar className="h-3 w-full" />
            <SkeletonBar className="h-2 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Table Skeleton */
export function TableSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="bg-canvas border border-hairline rounded-lg overflow-hidden w-full">
      <div className="bg-surface-soft/60 border-b border-hairline px-lg py-md">
        <SkeletonBar className="h-4 w-full max-w-[200px]" />
      </div>
      {[1, 2, 3, 4, 5].map((row) => (
        <div key={row} className="flex gap-lg px-lg py-md border-b border-hairline-soft">
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonBar key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
