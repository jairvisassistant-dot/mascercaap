import type { Dictionary } from "@/lib/i18n";

const stepIcons = [
  <svg key="browse" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>,
  <svg key="whatsapp" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>,
  <svg key="payment" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>,
  <svg key="delivery" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>,
];

export default function HowToBuy({ dict }: { dict: Dictionary }) {
  const { sectionLabel, title, subtitle, steps } = dict.home.howToBuy;

  return (
    <section className="py-24 bg-surface-page">
      <div className="max-w-7xl mx-auto px-4">
        <div className="fade-in-up text-center mb-16 max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="h-px w-10 bg-primary/40 rounded-full" />
            <span className="text-xs font-bold tracking-[0.22em] text-primary uppercase">
              {sectionLabel}
            </span>
            <span className="h-px w-10 bg-primary/40 rounded-full" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-text-main mb-4 text-balance">
            {title}
          </h2>
          <p className="text-text-muted leading-relaxed">
            {subtitle}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connector line — desktop only */}
          <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-border-mid to-transparent pointer-events-none" />

          {steps.map((step, index) => (
            <div
              key={step.number}
              className="fade-in-up flex flex-col items-center text-center group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="relative mb-6">
                <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/8 border border-primary/15 transition-all duration-300 group-hover:bg-primary/14 group-hover:border-primary/30 group-hover:scale-105">
                  <span className="text-primary">{stepIcons[index]}</span>
                </div>
                <span className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-[11px] font-bold shadow-sm">
                  {step.number}
                </span>
              </div>
              <h3 className="text-base font-bold text-text-main mb-2">{step.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed max-w-[24ch] mx-auto">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
