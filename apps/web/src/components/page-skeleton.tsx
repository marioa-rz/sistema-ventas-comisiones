import React from 'react';

export function PageSkeleton({ label }: { label: string }) {
  return (
    <div aria-live="polite" aria-label={label} className="min-h-[520px] animate-pulse space-y-6 py-4">
      <span className="sr-only">{label}</span>
      <div className="h-28 rounded-2xl border border-white/5 bg-[#131014]" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 rounded-2xl border border-white/5 bg-[#131014]" />)}
      </div>
      <div className="space-y-3 rounded-2xl border border-white/5 bg-[#0D0A0C] p-5">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-12 rounded-xl bg-[#1A151A]" />)}
      </div>
    </div>
  );
}
