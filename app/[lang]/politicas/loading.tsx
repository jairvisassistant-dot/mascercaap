export default function PoliticasLoading() {
  return (
    <div className="pt-20 animate-pulse">
      <div className="max-w-4xl mx-auto px-4 py-16 space-y-8">
        <div className="h-4 w-28 bg-surface-card rounded" />
        <div className="h-10 w-72 bg-surface-card rounded" />
        <div className="h-3 w-40 bg-surface-card rounded" />
        <div className="h-px bg-border-soft" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-5 w-48 bg-surface-card rounded" />
            <div className="h-4 w-full bg-surface-card rounded" />
            <div className="h-4 w-11/12 bg-surface-card rounded" />
            <div className="h-4 w-4/5 bg-surface-card rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
