import React from 'react';
interface SkeletonProps {
  className?: string;
  height?: string | number;
  width?: string | number;
  rounded?: string;
}

export function Skeleton({ className = '', height, width, rounded = 'rounded-xl' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${rounded} ${className}`}
      style={{ height, width }}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton() {
  return (
    <div
      className="rounded-2xl p-5 border"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
    >
      <Skeleton height={20} width="60%" className="mb-3" />
      <Skeleton height={14} className="mb-2" />
      <Skeleton height={14} width="80%" />
    </div>
  );
}
