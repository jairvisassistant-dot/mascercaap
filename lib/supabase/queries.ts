import { supabase } from "@/lib/supabase";
import type { Product, Testimonial } from "@/types";
import { products as staticProducts, featuredProducts as staticFeaturedProducts } from "@/data/products";
import { testimonials as staticTestimonials } from "@/data/testimonials";

export async function getAllProducts(): Promise<Product[]> {
  if (!supabase) return staticProducts;
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("display_order");
  if (error || !data) return staticProducts;
  return data.map(mapRowToProduct);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  if (!supabase) return staticFeaturedProducts;
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .eq("featured", true)
    .order("display_order")
    .limit(3);
  if (error || !data) return staticFeaturedProducts;
  return data.map(mapRowToProduct);
}

export async function getAllTestimonials(): Promise<Testimonial[]> {
  if (!supabase) return staticTestimonials;
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .eq("active", true)
    .order("created_at");
  if (error || !data) return staticTestimonials;
  return data;
}

function mapRowToProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    name: row.name as string,
    line: row.line as Product["line"],
    presentation: row.presentation as string,
    presentationOrder: row.presentation_order as number,
    price: row.price !== null ? (row.price as number) : undefined,
    image: row.image as string,
    description: row.description as string,
    ingredients: row.ingredients as string[] | undefined,
    benefits: row.benefits as string[] | undefined,
    isSoldOut: (row.is_sold_out as boolean) ?? false,
    isBestSeller: (row.is_best_seller as boolean) ?? false,
    featured: (row.featured as boolean) ?? false,
  };
}
