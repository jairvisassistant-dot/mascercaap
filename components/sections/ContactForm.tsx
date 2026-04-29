"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { m, AnimatePresence } from "framer-motion";
import { createContactSchema, type ContactFormData } from "@/lib/schemas/contact";
import { SITE_CONFIG } from "@/lib/config";
import { useDictionary } from "@/lib/i18n/DictionaryProvider";
import EmojiIcon from "@/components/ui/EmojiIcon";

export default function ContactForm() {
  const { dict } = useDictionary();
  const t = dict.contact.form;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"success" | "error" | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!submitStatus) return;
    const timer = setTimeout(() => setSubmitStatus(null), 8000);
    return () => clearTimeout(timer);
  }, [submitStatus]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(createContactSchema(dict.contact.validation)),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const wm = t.whatsappMsg;
        const tipoLabels = wm.tipoLabel as Record<string, string>;
        const msg = [
          wm.greeting,
          "",
          wm.intro.replace("{name}", data.nombre).replace("{reason}", tipoLabels[data.tipo] ?? data.tipo),
          data.empresa ? wm.company.replace("{company}", data.empresa) : null,
          wm.email.replace("{email}", data.email),
          wm.phone.replace("{phone}", data.telefono),
          "",
          wm.message,
          data.mensaje,
        ]
          .filter(Boolean)
          .join("\n");

        const waNumber = SITE_CONFIG.whatsappNumber;
        if (waNumber) {
          setWhatsappUrl(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`);
        }
        setSubmitStatus("success");
        reset();
      } else {
        setSubmitStatus("error");
      }
    } catch {
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {t.title}
      </h2>
      <p className="-mt-3 mb-6 text-sm leading-relaxed text-gray-600">
        {t.helper}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Nombre */}
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
            {t.labels.name}
          </label>
          <input
            id="nombre"
            type="text"
            {...register("nombre")}
            className={`w-full px-4 py-3 rounded-lg border ${
              errors.nombre ? "border-red-500" : "border-gray-300"
            } focus:ring-2 focus:ring-primary focus:border-transparent transition-all`}
            placeholder={t.placeholders.name}
          />
          {errors.nombre && (
            <p className="text-red-500 text-sm mt-1">{errors.nombre.message}</p>
          )}
        </div>

        {/* Empresa */}
        <div>
          <label htmlFor="empresa" className="block text-sm font-medium text-gray-700 mb-1">
            {t.labels.company}
          </label>
          <input
            id="empresa"
            type="text"
            {...register("empresa")}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            placeholder={t.placeholders.company}
          />
        </div>

        {/* Email + Teléfono */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {t.labels.email}
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.email ? "border-red-500" : "border-gray-300"
              } focus:ring-2 focus:ring-primary focus:border-transparent transition-all`}
              placeholder={t.placeholders.email}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
              {t.labels.phone}
            </label>
            <input
              id="telefono"
              type="tel"
              {...register("telefono")}
              className={`w-full px-4 py-3 rounded-lg border ${
                errors.telefono ? "border-red-500" : "border-gray-300"
              } focus:ring-2 focus:ring-primary focus:border-transparent transition-all`}
              placeholder={t.placeholders.phone}
            />
            {errors.telefono && (
              <p className="text-red-500 text-sm mt-1">{errors.telefono.message}</p>
            )}
          </div>
        </div>

        {/* Tipo */}
        <div>
          <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
            {t.labels.type}
          </label>
          <select
            id="tipo"
            {...register("tipo")}
            className={`w-full px-4 py-3 rounded-lg border ${
              errors.tipo ? "border-red-500" : "border-gray-300"
            } focus:ring-2 focus:ring-primary focus:border-transparent transition-all`}
          >
            <option value="">{t.options.default}</option>
            <option value="pedido">{t.options.order}</option>
            <option value="distribucion">{t.options.distribution}</option>
            <option value="otro">{t.options.other}</option>
          </select>
          {errors.tipo && (
            <p className="text-red-500 text-sm mt-1">{errors.tipo.message}</p>
          )}
        </div>

        {/* Mensaje */}
        <div>
          <label htmlFor="mensaje" className="block text-sm font-medium text-gray-700 mb-1">
            {t.labels.message}
          </label>
          <textarea
            id="mensaje"
            {...register("mensaje")}
            rows={4}
            className={`w-full px-4 py-3 rounded-lg border ${
              errors.mensaje ? "border-red-500" : "border-gray-300"
            } focus:ring-2 focus:ring-primary focus:border-transparent transition-all`}
            placeholder={t.placeholders.message}
          />
          {errors.mensaje && (
            <p className="text-red-500 text-sm mt-1">{errors.mensaje.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? t.submitting : t.submit}
        </button>
      </form>

      {/* Notificaciones con auto-cierre a los 8s */}
      <AnimatePresence>
        {submitStatus === "success" && (
          <m.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="mt-5 rounded-2xl overflow-hidden border border-green-200"
          >
            <div className="bg-green-50 px-5 py-4 flex items-start gap-3">
              <EmojiIcon emoji="✅" label={t.success.title} size="md" tone="success" decorative={false} />
              <div>
                <p className="font-semibold text-green-800">{t.success.title}</p>
                <p className="text-sm text-green-700 mt-0.5">
                  {t.success.text}
                </p>
              </div>
            </div>
            {whatsappUrl && (
              <div className="bg-white px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                <p className="text-sm text-gray-600">
                  {t.success.quickResponse}
                </p>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:scale-105 shadow-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  {t.success.whatsappButton}
                </a>
              </div>
            )}
          </m.div>
        )}
        {submitStatus === "error" && (
          <m.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="mt-5 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3"
          >
            <EmojiIcon emoji="❌" label={t.error} size="sm" tone="danger" decorative={false} />
            <p className="text-sm">{t.error}</p>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
