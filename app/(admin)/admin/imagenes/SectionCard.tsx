"use client";

export function SectionCard({
  title,
  count,
  accent,
  badge,
  children,
}: {
  title: string;
  count: number;
  accent: string;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border-soft bg-surface-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <h3 className={`text-xs font-bold uppercase tracking-[0.15em] ${accent}`}>
          {title}
        </h3>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badge}`}
        >
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}
