import { cache } from "react";
import { unstable_cache } from "next/cache";
import { supabasePublic as supabase } from "@/lib/supabase";
import type { Product, ProductCategory, ProductLineConfig, Testimonial } from "@/types";

function noClient(fn: string): never[] {
  // Always log — env vars missing is a critical config error, not noise.
  console.error(`[supabase] ${fn}: client is null — NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.`);
  return [];
}

function logQueryError(fn: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[supabase] ${fn} query failed: ${message}`);
}

export const getAllProducts = cache(
  unstable_cache(
    async (): Promise<Product[]> => {
      if (!supabase) return noClient("getAllProducts");
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("display_order");
      if (error) { logQueryError("getAllProducts", error); return []; }
      if (!data) return [];
      return data.map(mapRowToProduct);
    },
    ["all-products"],
    { revalidate: 300, tags: ["products"] }
  )
);

export const getFeaturedProducts = cache(
  unstable_cache(
    async (): Promise<Product[]> => {
      if (!supabase) return noClient("getFeaturedProducts");
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .eq("featured", true)
        .order("display_order")
        .limit(3);
      if (error) { logQueryError("getFeaturedProducts", error); return []; }
      if (!data) return [];
      return data.map(mapRowToProduct);
    },
    ["featured-products"],
    { revalidate: 300, tags: ["products"] }
  )
);

export const getAllTestimonials = cache(
  unstable_cache(
    async (): Promise<Testimonial[]> => {
      if (!supabase) return noClient("getAllTestimonials");
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .eq("active", true)
        .order("created_at");
      if (error) { logQueryError("getAllTestimonials", error); return []; }
      if (!data) return [];
      return data;
    },
    ["all-testimonials"],
    { revalidate: 300, tags: ["testimonials"] }
  )
);

export const getAllProductLines = cache(
  unstable_cache(
    async (): Promise<ProductLineConfig[]> => {
      if (!supabase) return noClient("getAllProductLines");
      const { data, error } = await supabase
        .from("product_lines")
        .select("*")
        .eq("active", true)
        .order("display_order");
      if (error) { logQueryError("getAllProductLines", error); return []; }
      if (!data) return [];
      return data.map((row) => ({
        key: row.key as string,
        label: row.label as string,
        description: row.description as string,
        gradient: row.gradient as string,
        iconEmoji: row.icon_emoji as string,
        chipImage: (row.chip_image as string) ?? undefined,
        categoryKey: (row.category_key as string | null) ?? null,
        orderAssistantEnabled: (row.order_assistant_enabled as boolean | null) ?? false,
        orderAssistantLabel: (row.order_assistant_label as string | null) ?? null,
      }));
    },
    ["all-product-lines"],
    { revalidate: 300, tags: ["product-lines"] }
  )
);

export const getAllProductCategories = cache(
  unstable_cache(
    async (): Promise<ProductCategory[]> => {
      if (!supabase) return noClient("getAllProductCategories");
      const { data, error } = await supabase
        .from("product_categories")
        .select("key, label")
        .eq("active", true)
        .order("display_order");
      if (error) { logQueryError("getAllProductCategories", error); return []; }
      if (!data) return [];
      return data.map((row) => ({
        key: row.key as string,
        label: row.label as string,
      }));
    },
    ["all-product-categories"],
    { revalidate: 300, tags: ["categories"] }
  )
);

export function mapRowToProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    name: row.name as string,
    line: row.line as Product["line"],
    presentation: row.presentation as string,
    presentationOrder: row.presentation_order as number,
    price: row.price !== null ? (row.price as number) : undefined,
    image: (row.image as string | null) ?? "",
    description: row.description as string,
    ingredients: row.ingredients as string[] | undefined,
    benefits: row.benefits as string[] | undefined,
    isSoldOut: (row.is_sold_out as boolean) ?? false,
    isBestSeller: (row.is_best_seller as boolean) ?? false,
    featured: (row.featured as boolean) ?? false,
  };
}
