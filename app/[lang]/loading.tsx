export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Hero skeleton */}
      <div className="relative min-h-[600px] md:min-h-[640px] bg-emerald-950/80">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24 md:py-28 md:px-12 lg:px-16">
          <div className="h-5 w-32 rounded bg-white/10 mb-5" />
          <div className="h-12 w-72 rounded bg-white/10 mb-4 md:h-16 md:w-96" />
          <div className="h-4 w-56 rounded bg-white/10 mb-2" />
          <div className="h-4 w-48 rounded bg-white/10 mb-8" />
          <div className="h-12 w-40 rounded-full bg-white/10" />
        </div>
      </div>

      {/* Content sections skeleton */}
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-12 lg:px-16 space-y-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-gray-100 h-56" />
          ))}
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-gray-100 h-40" />
          ))}
        </div>
      </div>
    </div>
  );
}
