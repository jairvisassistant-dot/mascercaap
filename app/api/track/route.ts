import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";

const ALLOWED_EVENTS = [
  "page_view",
  "cta_whatsapp",
  "helphub_open",
  "product_view",
  "contact_form_submit",
] as const;

const schema = z.object({
  event_name: z.enum(ALLOWED_EVENTS),
  page: z.string().max(500).optional(),
  referrer: z.string().max(500).optional(),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

const NO_CONTENT = NextResponse.json(null, { status: 204 });

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NO_CONTENT;
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NO_CONTENT;

  if (supabaseAdmin) {
    await supabaseAdmin.from("analytics_events").insert({
      event_name: parsed.data.event_name,
      page: parsed.data.page ?? null,
      referrer: parsed.data.referrer ?? null,
      properties: parsed.data.properties ?? {},
    });
  }

  return NO_CONTENT;
}
