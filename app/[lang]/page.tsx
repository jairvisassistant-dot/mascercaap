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
import { client } from "@/sanity/lib/client";
import { FEATURED_PRODUCTS_QUERY, ALL_TESTIMONIALS_QUERY } from "@/sanity/lib/queries";
import Link from "next/link";
import AnimatedWhatsAppButton from "@/components/ui/AnimatedWhatsAppButton";
import { SITE_CONFIG } from "@/lib/config";

export const revalidate = 60;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.metadata.home.title,
    description: dict.metadata.home.description,
    keywords: dict.metadata.home.keywords,
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

  const whatsappCta = `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(dict.whatsapp.message)}`;

  // Evitar llamadas a Sanity cuando no está configurado — el placeholder genera
  // requests fallidas que tardan ~900ms antes de caer al fallback estático.
  const sanityReady =
    !!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID &&
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID !== "placeholder";

  const [sanityProducts, sanityTestimonials] = sanityReady
    ? await Promise.all([
        client
          .fetch(FEATURED_PRODUCTS_QUERY, {}, { next: { revalidate: 3600 } })
          .catch((err: unknown) => {
            console.error("[Sanity] Failed to fetch featured products:", err instanceof Error ? err.message : "unknown");
            return [];
          }),
        client
          .fetch(ALL_TESTIMONIALS_QUERY, {}, { next: { revalidate: 3600 } })
          .catch((err: unknown) => {
            console.error("[Sanity] Failed to fetch testimonials:", err instanceof Error ? err.message : "unknown");
            return [];
          }),
      ])
    : [[], []];

  const featuredProducts = sanityProducts.length > 0 ? sanityProducts : staticFeaturedProducts;
  const testimonials = sanityTestimonials.length > 0 ? sanityTestimonials : staticTestimonials;

  return (
    <>
      <HeroCarousel />

      <ProductCategories />

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
                Clientes
              </span>
              <span className="h-px w-10 bg-white/20 rounded-full" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {dict.home.testimonials.title}
            </h2>
            <p className="text-white/50 max-w-2xl mx-auto">
              {dict.home.testimonials.subtitle}
            </p>
          </div>

          <TestimonialCarousel testimonials={testimonials} />
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
            Entregas en Bogotá
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-5 leading-tight">
            {dict.home.cta.title}
          </h2>
          <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            {dict.home.cta.text}
          </p>
          <AnimatedWhatsAppButton href={whatsappCta} label={dict.home.cta.button} />
        </div>
      </section>
    </>
  );
}
