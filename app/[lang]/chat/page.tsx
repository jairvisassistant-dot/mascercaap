import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import ChatResumeClient from "./ChatResumeClient";
import { getDictionary, hasLocale, type Locale } from "@/lib/i18n";
import { chatConfig } from "@/lib/chat/config";
import { getChatPool } from "@/lib/chat/db";
import {
  createResumeTokenStore,
  hashResumeToken,
  RESUME_TOKEN_QUERY_PARAM,
} from "@/lib/chat/resume-token";
import {
  buildVisitorSessionCookieValue,
  createVisitorSessionMaterial,
  parseVisitorSessionSigningKeys,
  resolveVisitorSessionTtl,
  visitorSessionCookieOptions,
} from "@/lib/chat/visitor-session";

/**
 * `/[lang]/chat` — opaque email resume-link landing page.
 *
 * The `?k=` token is redeemed server-side through the single-use
 * `ResumeTokenStore.redeem` contract; the replacement visitor session cookie is
 * set inside the Server Action. Invalid, expired, revoked and purged tokens all
 * resolve to one generic non-enumerating failure, so the page can never be used
 * as an existence oracle. The token is never persisted or logged.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.metadata.chat.title,
    description: dict.metadata.chat.description,
    robots: { index: false, follow: false },
  };
}

export default async function ChatResumePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const query = await searchParams;
  const rawToken = query[RESUME_TOKEN_QUERY_PARAM];
  const token = Array.isArray(rawToken) ? rawToken[0] ?? "" : rawToken ?? "";

  async function redeemResumeToken(k: string): Promise<{ ok: boolean }> {
    "use server";

    if (!chatConfig.enabled) return { ok: false };
    if (typeof k !== "string" || k.trim() === "") return { ok: false };

    let signingKeys;
    try {
      signingKeys = parseVisitorSessionSigningKeys(process.env.CHAT_SESSION_SECRET);
    } catch {
      return { ok: false };
    }

    const now = new Date();
    const ttlSeconds = resolveVisitorSessionTtl(process.env);
    const material = createVisitorSessionMaterial({ now, ttlSeconds });

    let result;
    try {
      result = await createResumeTokenStore(getChatPool()).redeem({
        tokenHash: hashResumeToken(k),
        now,
        newSession: {
          id: material.id,
          sessionHash: material.sessionHash,
          createdAt: material.createdAt,
          lastSeenAt: material.lastSeenAt,
          expiresAt: material.expiresAt,
        },
      });
    } catch {
      return { ok: false };
    }
    if (!result.ok) return { ok: false };

    try {
      const cookieStore = await cookies();
      cookieStore.set({
        ...visitorSessionCookieOptions({
          ttlSeconds,
          secure: process.env.NODE_ENV === "production",
        }),
        value: buildVisitorSessionCookieValue(material.secret, signingKeys),
      });
    } catch {
      return { ok: false };
    }

    return { ok: true };
  }

  return (
    <ChatResumeClient
      dict={dict}
      lang={lang as Locale}
      token={token}
      redeem={redeemResumeToken}
    />
  );
}
