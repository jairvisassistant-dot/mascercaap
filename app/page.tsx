import HeroCarousel from "@/components/ui/HeroCarousel";
import FeaturedProducts from "@/components/sections/FeaturedProducts";
import WhyChooseUs from "@/components/sections/WhyChooseUs";
import DailyOffer from "@/components/sections/DailyOffer";
import TestimonialCarousel from "@/components/ui/TestimonialCarousel";
import { featuredProducts } from "@/data/products";
import { testimonials } from "@/data/testimonials";
import Link from "next/link";

const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "573001234567";
const whatsappCta = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hola! Quiero hacer un pedido")}`;

export default function HomePage() {
  return (
    <>
      {/* Hero Carousel */}
      <HeroCarousel />

      {/* Featured Products */}
      <FeaturedProducts products={featuredProducts} />

      {/* Why Choose Us */}
      <WhyChooseUs />

      {/* Daily Offer with Countdown */}
      <DailyOffer />

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
              Lo que dicen nuestros clientes
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Empresas y negocios que confían en Mas Cerca Ap para sus necesidades de jugos naturales.
            </p>
          </div>

          <TestimonialCarousel testimonials={testimonials} />
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 bg-primary">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            ¿Listo para probar la frescura?
          </h2>
          <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
            Contáctanos por WhatsApp y haz tu pedido. Entregamos en toda Bogotá.
          </p>
          <Link
            href={whatsappCta}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-accent hover:bg-accent-dark text-white font-bold py-4 px-8 rounded-full transition-all hover:scale-105 text-lg"
          >
            Hacer pedido por WhatsApp
          </Link>
        </div>
      </section>
    </>
  );
}