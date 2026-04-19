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

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              {dict.home.testimonials.title}
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              {dict.home.testimonials.subtitle}
            </p>
          </div>

          <TestimonialCarousel testimonials={testimonials} />
        </div>
      </section>

      <section className="py-16 bg-primary">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {dict.home.cta.title}
          </h2>
          <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
            {dict.home.cta.text}
          </p>
          <Link
            href={whatsappCta}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-accent hover:bg-accent-dark text-white font-bold py-4 px-8 rounded-full transition-all hover:scale-105 text-lg"
          >
            {dict.home.cta.button}
          </Link>
        </div>
      </section>
    </>
  );
}
