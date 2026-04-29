import { SITE_CONFIG } from "@/lib/config";
import ContactForm from "@/components/sections/ContactForm";
import { AnimateInView } from "@/components/ui/motion/AnimateInView";
import type { Dictionary } from "@/lib/i18n";

export default function ContactoPageContent({ dict }: { dict: Dictionary }) {
  const t = dict.contact;

  return (
    <div className="pt-20">

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-dark via-primary to-[#5f9f63] py-16 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-accent/10 blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

        <div className="absolute right-0 inset-y-0 pointer-events-none overflow-hidden">
          <svg viewBox="0 0 400 300" className="absolute right-0 top-0 h-full w-auto opacity-[0.07]" fill="white">
            <path d="M380 0 C240 20 120 80 80 160 C40 240 120 300 220 280 C320 260 420 180 400 80 Z" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10 text-center text-white">
          <p className="text-xs font-bold tracking-widest text-white/60 uppercase mb-4 fade-in-up">
            Más Cerca AP · Chía, Colombia
          </p>
          <h1
            className="text-4xl md:text-5xl font-bold mb-4 leading-tight fade-in-up [animation-delay:50ms]"
          >
            {t.hero.title}
          </h1>
          <p
            className="text-xl opacity-85 max-w-2xl mx-auto fade-in-up [animation-delay:100ms]"
          >
            {t.hero.subtitle}
          </p>

          <div className="inline-flex items-center gap-2 mt-8 bg-white/15 border border-white/20 backdrop-blur-sm rounded-full px-5 py-2.5 text-sm font-medium text-white fade-in-up [animation-delay:180ms]">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            {dict.contact.hero.responseTime}
          </div>
        </div>
      </section>

      {/* Sección principal — info editorial + formulario */}
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-12 items-start">

            {/* Columna izquierda — identidad + datos de contacto */}
            <AnimateInView direction="left" className="space-y-8">
              <div className="rounded-2xl bg-gradient-to-br from-primary/8 to-accent/5 border border-primary/10 p-6">
                <p className="text-xs font-bold tracking-widest text-primary uppercase mb-3">
                  {dict.contact.whoWeAre.label}
                </p>
                <p className="text-gray-700 leading-relaxed text-sm">
                  {dict.contact.whoWeAre.text}
                </p>
              </div>

              <div className="space-y-0 divide-y divide-gray-100">

                {/* Ubicación */}
                <div className="flex items-start gap-4 py-5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{t.cards.location.title}</p>
                    <p className="font-semibold text-gray-800">{SITE_CONFIG.address}</p>
                    <p className="text-sm text-gray-500">{SITE_CONFIG.addressCity}</p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4 py-5">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{t.cards.email.title}</p>
                    <a href={`mailto:${SITE_CONFIG.emailContact}`} className="font-semibold text-gray-800 hover:text-primary transition-colors">
                      {SITE_CONFIG.emailContact}
                    </a>
                  </div>
                </div>

                {/* Teléfono */}
                <div className="flex items-start gap-4 py-5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{t.cards.phone.title}</p>
                    <p className="font-semibold text-gray-800">{SITE_CONFIG.phoneDisplay}</p>
                    <span className="inline-flex items-center gap-1 text-xs text-[#25D366] font-medium mt-0.5">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      {t.cards.phone.whatsapp}
                    </span>
                  </div>
                </div>
              </div>
            </AnimateInView>

            {/* Columna derecha — formulario */}
            <AnimateInView direction="right">
              <ContactForm />
            </AnimateInView>
          </div>
        </div>
      </section>

      {/* Mapa */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <AnimateInView className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-800">{t.map.title}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{t.map.subtitle}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                <span>{SITE_CONFIG.addressCity}</span>
              </div>
            </div>

            <iframe
              src="https://maps.google.com/maps?q=Calle+12a+%2315-53+Chia+Colombia&t=&z=16&ie=UTF8&iwloc=&output=embed"
              width="100%"
              height="320"
              style={{ border: 0, display: "block" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              sandbox="allow-scripts allow-same-origin allow-popups"
              title={t.map.iframeTitle}
            />
          </AnimateInView>
        </div>
      </section>
    </div>
  );
}
