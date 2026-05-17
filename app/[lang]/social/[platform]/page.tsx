import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE_CONFIG } from "@/lib/config";
import { getDictionary, hasLocale, locales } from "@/lib/i18n";

const PLATFORMS = ["instagram", "facebook", "tiktok"] as const;
type Platform = (typeof PLATFORMS)[number];

function isPlatform(value: string): value is Platform {
  return PLATFORMS.includes(value as Platform);
}

function getSocialUrl(platform: Platform): string {
  switch (platform) {
    case "instagram":
      return SITE_CONFIG.socialInstagram;
    case "facebook":
      return SITE_CONFIG.socialFacebook;
    case "tiktok":
      return SITE_CONFIG.socialTikTok;
  }
}

export function generateStaticParams() {
  return locales.flatMap((lang) =>
    PLATFORMS.map((platform) => ({ lang, platform }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; platform: string }>;
}): Promise<Metadata> {
  const { lang, platform } = await params;
  if (!hasLocale(lang) || !isPlatform(platform)) return {};
  const dict = await getDictionary(lang);
  const t = dict.socialQr[platform];
  return {
    title: t.eyebrow,
    description: t.description,
    robots: { index: false, follow: false },
    openGraph: {
      title: t.eyebrow,
      description: t.description,
      type: "website",
      url: `${SITE_CONFIG.siteUrl}/${lang}/social/${platform}`,
    },
  };
}

export default async function SocialPlatformPage({
  params,
}: {
  params: Promise<{ lang: string; platform: string }>;
}) {
  const { lang, platform } = await params;

  if (!hasLocale(lang)) notFound();
  if (!isPlatform(platform)) notFound();

  const dict = await getDictionary(lang);
  const t = dict.socialQr[platform];
  const socialUrl = getSocialUrl(platform);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=16&data=${encodeURIComponent(socialUrl)}`;

  return (
    <div className="grid min-h-[calc(100svh-88px)] place-items-center bg-surface-warm px-4 py-24 sm:py-28">
      <section className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-[1.75rem] bg-surface-card shadow-[0_22px_70px_rgba(15,23,42,0.12)] ring-1 ring-border-soft lg:grid-cols-[0.92fr_1.08fr]">
        <div className="bg-[#233746] px-6 py-9 text-white sm:px-9 lg:py-12">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-white/52">
            {t.eyebrow}
          </p>
          <h1 className="text-3xl font-bold leading-tight tracking-[-0.035em] sm:text-[2.35rem]">
            {t.title}
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
            {t.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={socialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-accent-dark"
            >
              {t.openProfile}
            </a>
            <Link
              href={`/${lang}`}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/18 bg-white/8 px-5 py-2.5 text-sm font-bold text-white/82 transition hover:bg-white/14 hover:text-white"
            >
              {t.backHome}
            </Link>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center px-6 py-9 text-center sm:px-9 lg:py-12">
          <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.12)] ring-1 ring-black/8">
            <Image
              src={qrUrl}
              alt={t.qrAlt}
              width={320}
              height={320}
              priority
              className="h-64 w-64 rounded-2xl sm:h-72 sm:w-72"
            />
          </div>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-text-muted">
            {t.scanHint}
          </p>
          <p className="mt-3 break-all rounded-xl bg-surface-soft px-4 py-3 text-xs text-text-muted ring-1 ring-border-soft">
            {socialUrl}
          </p>
        </div>
      </section>
    </div>
  );
}
