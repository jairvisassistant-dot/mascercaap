import type { Dictionary, Locale } from "@/lib/i18n";
import type { Testimonial } from "@/types";

interface TestimonialMarqueeProps {
  testimonials: Testimonial[];
  dict: Dictionary;
  lang: Locale;
}

export default function TestimonialMarquee({ testimonials, dict, lang }: TestimonialMarqueeProps) {
  if (testimonials.length === 0) return null;

  const firstRow = testimonials.filter((_, index) => index % 2 === 0);
  const secondRow = testimonials.filter((_, index) => index % 2 === 1);

  return (
    <div aria-label={dict.home.testimonials.title} className="relative -mx-4 space-y-5 overflow-hidden px-4">
      <MarqueeRow items={firstRow} lang={lang} direction="normal" />
      <MarqueeRow items={secondRow.length > 0 ? secondRow : firstRow} lang={lang} direction="reverse" />

      <div className="hidden grid-cols-1 gap-4 motion-reduce:grid sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((testimonial) => (
          <TestimonialCard key={testimonial.id} testimonial={testimonial} lang={lang} />
        ))}
      </div>

      <style>{`
        @keyframes testimonial-marquee {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(-50%, 0, 0); }
        }
      `}</style>
    </div>
  );
}

function MarqueeRow({
  items,
  lang,
  direction,
}: {
  items: Testimonial[];
  lang: Locale;
  direction: "normal" | "reverse";
}) {
  const duplicatedItems = [...items, ...items];

  return (
    <div className="group motion-reduce:hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <div
        className="flex w-max gap-5 will-change-transform group-hover:[animation-play-state:paused]"
        style={{
          animation: "testimonial-marquee 42s linear infinite",
          animationDirection: direction,
        }}
      >
        {duplicatedItems.map((testimonial, index) => (
          <TestimonialCard key={`${testimonial.id}-${index}`} testimonial={testimonial} lang={lang} />
        ))}
      </div>
    </div>
  );
}

function TestimonialCard({ testimonial, lang }: { testimonial: Testimonial; lang: Locale }) {
  const text = (lang !== "es" && testimonial.text_en) || testimonial.text;
  const role = (lang !== "es" && testimonial.role_en) || testimonial.role;

  return (
    <article className="w-[320px] shrink-0 rounded-2xl border border-white/13 bg-white/[0.07] p-6 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm">
      <div className="mb-4 flex gap-1" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <svg
            key={index}
            className={`h-4 w-4 ${index < testimonial.rating ? "text-accent" : "text-white/20"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <p className="min-h-[108px] text-sm leading-relaxed text-white/84">&ldquo;{text}&rdquo;</p>
      <div className="mt-5 h-px w-10 bg-accent/60" />
      <div className="mt-4">
        <p className="text-sm font-bold text-white">{testimonial.name}</p>
        <p className="mt-1 text-xs leading-relaxed text-white/56">{role}</p>
      </div>
    </article>
  );
}
