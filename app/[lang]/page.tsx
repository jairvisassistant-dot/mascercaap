import { notFound } from "next/navigation";
import { getDictionary, hasLocale } from "@/lib/i18n";
import type { Metadata } from "next";
import HeroCarousel from "@/components/ui/HeroCarousel";
import ProductCategories from "@/components/sections/ProductCategories";
import FeaturedProducts from "@/components/sections/FeaturedProducts";
import WhyChooseUs from "@/components/sections/WhyChooseUs";
import DailyOffer from "@/components/sections/DailyOffer";
import TestimonialCarousel from "@/components/ui/TestimonialCarousel";
import { testimonials as staticTestimonials } from "@/data/testimonials";
import { featuredProducts as staticFeaturedProducts } from "@/data/products";
import { FEATURED_PRODUCTS_QUERY, ALL_TESTIMONIALS_QUERY } from "@/sanity/lib/queries";
import { safeFetch } from "@/lib/sanity/safeFetch";
import AnimatedWhatsAppButton from "@/components/ui/AnimatedWhatsAppButton";
import { SITE_CONFIG } from "@/lib/config";

export const revalidate = 3600;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.metadata.home.title,
    description: dict.metadata.home.description,
    keywords: dict.metadata.home.keywords,
    openGraph: {
      title: dict.metadata.home.title,
      description: dict.metadata.home.description,
      type: "website",
      locale: lang === "es" ? "es_CO" : "en_US",
      images: [{ url: `${SITE_CONFIG.siteUrl}${SITE_CONFIG.logoPath}`, width: 346, height: 214, alt: "Mas Cerca AP" }],
    },
    twitter: {
      card: "summary_large_image",
      title: dict.metadata.home.title,
      description: dict.metadata.home.description,
    },
    alternates: {
      canonical: `${SITE_CONFIG.siteUrl}/${lang}`,
      languages: {
        es: `${SITE_CONFIG.siteUrl}/es`,
        en: `${SITE_CONFIG.siteUrl}/en`,
      },
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);

  const waNumber = SITE_CONFIG.whatsappNumber;
  const whatsappCta = waNumber
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(dict.whatsapp.message)}`
    : "#";

  const [featuredProducts, testimonials] = await Promise.all([
    safeFetch(FEATURED_PRODUCTS_QUERY, {}, staticFeaturedProducts),
    safeFetch(ALL_TESTIMONIALS_QUERY, {}, staticTestimonials),
  ]);

  return (
    <>
      <HeroCarousel />

      <ProductCategories dict={dict} lang={lang} />

      <FeaturedProducts products={featuredProducts} dict={dict} />

      <WhyChooseUs dict={dict} />

      <DailyOffer dict={dict} />

      <section className="py-24 bg-gray-900 relative overflow-hidden">
        {/* Glow decorativo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="text-center mb-14">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="h-px w-10 bg-white/20 rounded-full" />
              <span className="text-xs font-bold tracking-[0.22em] text-white/40 uppercase">
                {dict.home.testimonials.label}
              </span>
              <span className="h-px w-10 bg-white/20 rounded-full" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {dict.home.testimonials.title}
            </h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              {dict.home.testimonials.subtitle}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {dict.home.testimonials.highlights.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center rounded-full border border-white/12 bg-white/6 px-4 py-2 text-[11px] font-semibold text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <TestimonialCarousel testimonials={testimonials} dict={dict} lang={lang} />
        </div>
      </section>

      <section className="py-20 bg-gradient-to-br from-primary via-primary to-primary-dark relative overflow-hidden">
        {/* Textura de puntos */}
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />
        <div className="max-w-3xl mx-auto px-4 text-center relative">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-white text-xs font-bold tracking-[0.2em] uppercase px-4 py-2 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            {dict.home.cta.badge}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-5 leading-tight">
            {dict.home.cta.title}
          </h2>
          <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            {dict.home.cta.text}
          </p>
          <div className="mb-10 flex flex-wrap justify-center gap-3">
            {dict.home.cta.highlights.map((item) => (
              <span
                key={item}
                className="inline-flex items-center rounded-full border border-white/18 bg-white/10 px-4 py-2 text-xs font-semibold text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm"
              >
                {item}
              </span>
            ))}
          </div>
          <AnimatedWhatsAppButton href={whatsappCta} label={dict.home.cta.button} />
        </div>
      </section>
    </>
  );
}
