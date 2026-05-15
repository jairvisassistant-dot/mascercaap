import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { Product, ProductCategory, ProductLineConfig, Testimonial } from "@/types";

function noClient(fn: string): never[] {
  console.error(`Supabase not configured — ${fn} returned empty. Check env vars.`);
  return [];
}

export const getAllProducts = unstable_cache(
  async (): Promise<Product[]> => {
    if (!supabase) return noClient("getAllProducts");
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("display_order");
    if (error || !data) return [];
    return data.map(mapRowToProduct);
  },
  ["all-products"],
  { revalidate: 3600, tags: ["products"] }
);

export const getFeaturedProducts = unstable_cache(
  async (): Promise<Product[]> => {
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
  },
  ["featured-products"],
  { revalidate: 3600, tags: ["products"] }
);

export const getAllTestimonials = unstable_cache(
  async (): Promise<Testimonial[]> => {
    if (!supabase) return noClient("getAllTestimonials");
    const { data, error } = await supabase
      .from("testimonials")
      .select("*")
      .eq("active", true)
      .order("created_at");
    if (error || !data) return [];
    return data;
  },
  ["all-testimonials"],
  { revalidate: 3600, tags: ["testimonials"] }
);

export const getAllProductLines = unstable_cache(
  async (): Promise<ProductLineConfig[]> => {
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
  },
  ["all-product-lines"],
  { revalidate: 3600, tags: ["product-lines"] }
);

export const getAllProductCategories = unstable_cache(
  async (): Promise<ProductCategory[]> => {
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
  },
  ["all-product-categories"],
  { revalidate: 3600, tags: ["categories"] }
);

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
