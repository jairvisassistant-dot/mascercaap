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
          <Link
            href={whatsappCta}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-accent hover:bg-accent-dark text-white font-bold py-4 px-10 rounded-full transition-all hover:scale-105 text-base shadow-lg shadow-black/20"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {dict.home.cta.button}
          </Link>
        </div>
      </section>
    </>
  );
}
