import { SealBadge } from "@/components/ui/SealBadge";
import type { Dictionary } from "@/lib/i18n";

const emojis = ["🤝", "🌿", "🏆", "🚚"];

export default function DailyOffer({ dict }: { dict: Dictionary }) {
  const badges = dict.home.dailyOffer.badges;

  return (
    <section className="py-20 bg-gradient-to-br from-[#3a7f45] via-[#438b4d] to-[#347640] relative overflow-hidden">
      {/* Textura sutil de puntos */}
      <div className="absolute inset-0 opacity-[0.045] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      />
      <div className="max-w-7xl mx-auto px-4 relative">
        <div className="fade-in-up text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="h-px w-10 bg-white/24 rounded-full" />
            <span className="text-xs font-bold tracking-[0.22em] text-white/76 uppercase">
              {dict.home.dailyOffer.sectionLabel}
            </span>
            <span className="h-px w-10 bg-white/24 rounded-full" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
            {dict.home.dailyOffer.title}
          </h2>
          <p className="text-white/74 max-w-2xl mx-auto">
            {dict.home.dailyOffer.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-8 md:gap-16">
          {badges.map((badge, index) => (
            <SealBadge
              key={index}
              emoji={emojis[index]}
              top={badge.top}
              bottom={badge.bottom}
              delay={index * 0.12}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );

}
