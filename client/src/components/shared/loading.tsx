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
        src="/logo.svg"
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

export function SectionLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <Spinner />
    </div>
  );
}
