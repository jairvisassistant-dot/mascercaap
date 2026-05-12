import { supabase } from "@/lib/supabase";
import type { Product, ProductCategory, ProductLineConfig, Testimonial } from "@/types";

function noClient(fn: string): never[] {
  console.error(`Supabase not configured — ${fn} returned empty. Check env vars.`);
  return [];
}

export async function getAllProducts(): Promise<Product[]> {
  if (!supabase) return noClient("getAllProducts");
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("display_order");
  if (error || !data) return [];
  return data.map(mapRowToProduct);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  if (!supabase) return noClient("getFeaturedProducts");
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .eq("featured", true)
    .order("display_order")
    .limit(3);
  if (error || !data) return [];
  return data.map(mapRowToProduct);
}

export async function getAllTestimonials(): Promise<Testimonial[]> {
  if (!supabase) return noClient("getAllTestimonials");
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .eq("active", true)
    .order("created_at");
  if (error || !data) return [];
  return data;
}

export async function getAllProductLines(): Promise<ProductLineConfig[]> {
  if (!supabase) return noClient("getAllProductLines");
  const { data, error } = await supabase
    .from("product_lines")
    .select("*")
    .eq("active", true)
    .order("display_order");
  if (error || !data) return [];
  return data.map((row) => ({
    key: row.key as string,
    label: row.label as string,
    description: row.description as string,
    gradient: row.gradient as string,
    iconEmoji: row.icon_emoji as string,
    chipImage: (row.chip_image as string) ?? undefined,
    categoryKey: (row.category_key as string | null) ?? null,
  }));
}

export async function getAllProductCategories(): Promise<ProductCategory[]> {
  if (!supabase) return noClient("getAllProductCategories");
  const { data, error } = await supabase
    .from("product_categories")
    .select("key, label")
    .eq("active", true)
    .order("display_order");
  if (error || !data) return [];
  return data.map((row) => ({
    key: row.key as string,
    label: row.label as string,
  }));
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
