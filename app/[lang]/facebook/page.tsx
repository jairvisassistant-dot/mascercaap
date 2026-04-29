import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE_CONFIG } from "@/lib/config";
import { hasLocale } from "@/lib/i18n";

export default async function FacebookPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!hasLocale(lang)) notFound();

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=16&data=${encodeURIComponent(SITE_CONFIG.socialFacebook)}`;
  const isSpanish = lang === "es";

  return (
    <div className="grid min-h-[calc(100svh-88px)] place-items-center bg-[#f7f3eb] px-4 py-24 sm:py-28">
      <section className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-[1.75rem] bg-white shadow-[0_22px_70px_rgba(15,23,42,0.12)] ring-1 ring-black/5 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="bg-[#233746] px-6 py-9 text-white sm:px-9 lg:py-12">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-white/52">
            Facebook · Mas Cerca AP
          </p>
          <h1 className="text-3xl font-bold leading-tight tracking-[-0.035em] sm:text-[2.35rem]">
            {isSpanish ? "Conectá con nuestro perfil oficial" : "Connect with our official profile"}
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
            {isSpanish
              ? "Este QR abre el perfil público de Mas Cerca AP. No es un código para iniciar sesión en Facebook en otro dispositivo."
              : "This QR opens the public Mas Cerca AP profile. It is not a code to sign in to Facebook on another device."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={SITE_CONFIG.socialFacebook}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-accent-dark"
            >
              {isSpanish ? "Abrir perfil" : "Open profile"}
            </a>
            <Link
              href={`/${lang}`}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/18 bg-white/8 px-5 py-2.5 text-sm font-bold text-white/82 transition hover:bg-white/14 hover:text-white"
            >
              {isSpanish ? "Volver al inicio" : "Back home"}
            </Link>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center px-6 py-9 text-center sm:px-9 lg:py-12">
          <div className="rounded-[1.5rem] bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.12)] ring-1 ring-black/8">
            <Image
              src={qrUrl}
              alt={isSpanish ? "QR del perfil de Facebook de Mas Cerca AP" : "Mas Cerca AP Facebook profile QR"}
              width={320}
              height={320}
              priority
              unoptimized
              className="h-64 w-64 rounded-2xl sm:h-72 sm:w-72"
            />
          </div>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-gray-600">
            {isSpanish
              ? "Escanealo con la cámara del celular para abrir el perfil en la app o navegador de Facebook."
              : "Scan it with your phone camera to open the profile in the Facebook app or browser."}
          </p>
          <p className="mt-3 break-all rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500 ring-1 ring-gray-100">
            {SITE_CONFIG.socialFacebook}
          </p>
        </div>
      </section>
    </div>
  );
}
