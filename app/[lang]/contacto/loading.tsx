export default function ContactoLoading() {
  return (
    <div className="pt-20 animate-pulse">
      {/* Hero skeleton */}
      <div className="h-52 bg-gradient-to-br from-emerald-950 to-emerald-900 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col items-center gap-3">
          <div className="h-3 w-40 bg-white/10 rounded" />
          <div className="h-10 w-64 bg-white/10 rounded" />
          <div className="h-4 w-80 bg-white/10 rounded" />
          <div className="h-8 w-44 bg-white/10 rounded-full mt-2" />
        </div>
      </div>

      {/* Form + info skeleton */}
      <section className="py-14 bg-surface-page">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-12">
            {/* Left column */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-border-soft p-6 space-y-3">
                <div className="h-3 w-20 bg-surface-card rounded" />
                <div className="h-4 w-full bg-surface-card rounded" />
                <div className="h-4 w-5/6 bg-surface-card rounded" />
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-4 py-5 border-b border-border-soft">
                  <div className="w-10 h-10 rounded-xl bg-surface-card shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-16 bg-surface-card rounded" />
                    <div className="h-4 w-40 bg-surface-card rounded" />
                  </div>
                </div>
              ))}
            </div>

            {/* Right column — form */}
            <div className="rounded-2xl border border-border-soft p-6 space-y-5">
              <div className="h-6 w-48 bg-surface-card rounded" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-24 bg-surface-card rounded" />
                  <div className="h-10 bg-surface-card rounded-xl" />
                </div>
              ))}
              <div className="h-12 bg-primary/20 rounded-xl" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
