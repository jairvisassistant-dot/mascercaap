export default function ProductosLoading() {
  return (
    <div className="pt-20 animate-pulse">
      {/* Hero skeleton */}
      <div className="h-44 bg-surface-soft" />

      {/* Filter bar skeleton */}
      <div className="sticky top-[68px] bg-surface-page border-b border-border-soft shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-28 bg-surface-card rounded-full" />
          ))}
        </div>
      </div>

      {/* Product lines skeleton */}
      <section className="py-10 bg-surface-page min-h-[50vh]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col gap-12">
          {[1, 2].map((section) => (
            <div key={section}>
              {/* Line header */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-11 h-11 bg-surface-card rounded-xl" />
                <div className="flex flex-col gap-2">
                  <div className="h-5 w-36 bg-surface-card rounded" />
                  <div className="h-3 w-52 bg-surface-card rounded" />
                </div>
              </div>
              {/* Cards row */}
              <div className="flex gap-5 overflow-hidden">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="shrink-0 w-[234px] rounded-2xl border border-border-soft">
                    <div className="h-60 bg-surface-card rounded-t-2xl" />
                    <div className="p-4 flex flex-col gap-2">
                      <div className="h-4 bg-surface-card rounded w-3/4" />
                      <div className="h-3 bg-surface-card rounded w-full" />
                      <div className="h-3 bg-surface-card rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
