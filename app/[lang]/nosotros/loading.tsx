export default function NosotrosLoading() {
  return (
    <div className="pt-20 animate-pulse">
      {/* Hero banner skeleton */}
      <div className="h-64 bg-emerald-950/80 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-14 flex flex-col items-center gap-4">
          <div className="h-3 w-28 bg-white/10 rounded" />
          <div className="h-10 w-72 bg-white/10 rounded md:h-14 md:w-96" />
          <div className="h-4 w-64 bg-white/10 rounded" />
          <div className="h-8 w-36 bg-white/10 rounded-full mt-2" />
        </div>
      </div>

      {/* Content sections skeleton */}
      <div className="max-w-7xl mx-auto px-4 py-16 space-y-16">
        {/* Story section */}
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <div className="h-4 w-24 bg-surface-card rounded" />
            <div className="h-8 w-56 bg-surface-card rounded" />
            <div className="h-4 w-full bg-surface-card rounded" />
            <div className="h-4 w-5/6 bg-surface-card rounded" />
            <div className="h-4 w-4/6 bg-surface-card rounded" />
          </div>
          <div className="h-64 bg-surface-card rounded-2xl" />
        </div>

        {/* Team cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border-soft overflow-hidden">
              <div className="h-48 bg-surface-card" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-2/3 bg-surface-card rounded" />
                <div className="h-3 w-1/2 bg-surface-card rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
