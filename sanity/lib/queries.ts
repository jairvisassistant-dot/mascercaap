import { defineQuery } from "next-sanity";

export const ALL_PRODUCTS_QUERY = defineQuery(`
  *[_type == "product"] | order(orderRank) {
    "id": id.current,
    name,
    line,
    presentation,
    presentationOrder,
    price,
    "image": image.asset->url,
    description,
    ingredients,
    benefits,
    isSoldOut,
    isBestSeller,
    featured
  }
`);

export const FEATURED_PRODUCTS_QUERY = defineQuery(`
  *[_type == "product" && featured == true] | order(orderRank) {
    "id": id.current,
    name,
    line,
    presentation,
    presentationOrder,
    price,
    "image": image.asset->url,
    description,
    ingredients,
    benefits,
    isSoldOut,
    isBestSeller,
    featured
  }
`);

export const ALL_TESTIMONIALS_QUERY = defineQuery(`
  *[_type == "testimonial"] | order(_createdAt asc) {
    "id": _id,
    name,
    role,
    text,
    rating
  }
`);

export const ALL_SALES_POINTS_QUERY = defineQuery(`
  *[_type == "salesPoint"] | order(_createdAt asc) {
    "id": _id,
    name,
    address,
    neighborhood,
    schedule,
    phone
  }
`);
