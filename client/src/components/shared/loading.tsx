export function Spinner({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={`animate-spin text-[#1B5E20] ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F5F1E8] gap-4">
      <img
        src="/brand/logo-mark.webp"
        alt="JiraniHub"
        className="w-20 h-20 object-contain drop-shadow-md"
        onError={(e) => {
          const t = e.currentTarget;
          t.style.display = "none";
          const fallback = t.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = "flex";
        }}
      />
      <div
        className="w-16 h-16 rounded-2xl bg-[#1B5E20] items-center justify-center hidden"
        style={{ display: "none" }}
      >
        <span className="text-white font-black text-xl">JH</span>
      </div>
      <Spinner className="h-6 w-6" />
      <p className="text-xs text-[#6B5D45] font-medium tracking-wide">JiraniHub</p>
    </div>
  );
}

// Skeleton rows instead of a bare spinner — closer to the eventual card
// layout most list pages render, so the transition from loading to loaded
// doesn't cause a jarring layout jump, and the page reads as "getting
// there" rather than "stalled" on a slow 3G connection.
export function SectionLoader({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2.5 py-2" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-tribal-border bg-white p-4 animate-pulse"
        >
          <div className="h-10 w-10 shrink-0 rounded-lg bg-tribal-cream-dark" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/3 rounded bg-tribal-cream-dark" />
            <div className="h-3 w-1/3 rounded bg-tribal-cream-dark" />
          </div>
        </div>
      ))}
    </div>
  );
}
