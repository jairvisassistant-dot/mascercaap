"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { salesPoints } from "@/data/salesPoints";

const contactSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  empresa: z.string().optional(),
  email: z.string().email("Ingresa un email válido"),
  telefono: z.string().min(7, "El teléfono debe tener al menos 7 dígitos"),
  tipo: z.enum(["pedido", "distribucion", "otro"], { message: "Selecciona un tipo de consulta" }),
  mensaje: z.string().min(10, "El mensaje debe tener al menos 10 caracteres"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactoPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"success" | "error" | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "573001234567";

  const tipoLabel: Record<string, string> = {
    pedido: "realizar un pedido",
    distribucion: "ser distribuidor / mayoreo",
    otro: "hacer una consulta",
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
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
        // Construir mensaje pre-cargado para WhatsApp
        const msg = [
          `Hola Más Cerca AP! 👋`,
          ``,
          `Mi nombre es *${data.nombre}* y me contacté por el formulario web para ${tipoLabel[data.tipo] ?? data.tipo}.`,
          data.empresa ? `🏢 Empresa: ${data.empresa}` : null,
          `📧 Email: ${data.email}`,
          `📞 Teléfono: ${data.telefono}`,
          ``,
          `💬 Mensaje:`,
          data.mensaje,
        ]
          .filter(Boolean)
          .join("\n");

        setWhatsappUrl(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`);
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
    <div className="pt-20">
        {/* Hero */}
        <section className="bg-gradient-to-r from-primary to-primary-dark py-16">
          <div className="max-w-7xl mx-auto px-4 text-center text-white">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold mb-4"
            >
              Contáctanos
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl opacity-90 max-w-2xl mx-auto"
            >
              Estamos listos para levarte la frescura a tu puerta
            </motion.p>
          </div>
        </section>

        {/* Contact Info Cards */}
        <section className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0 }}
                className="bg-white p-8 rounded-2xl shadow-lg text-center hover:shadow-xl transition-shadow"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Ubicación</h3>
                <p className="text-gray-600">Bogotá, Colombia</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-white p-8 rounded-2xl shadow-lg text-center hover:shadow-xl transition-shadow"
              >
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Email</h3>
                <p className="text-gray-600">hola@mascercap.com</p>
                <p className="text-gray-600">pedidos@mascercap.com</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="bg-white p-8 rounded-2xl shadow-lg text-center hover:shadow-xl transition-shadow"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Teléfono</h3>
                <p className="text-gray-600">+57 300 123 4567</p>
                <p className="text-sm text-gray-500">WhatsApp disponible</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Contact Form & Map */}
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Form */}
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">
                    Envíanos un mensaje
                  </h2>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre completo *
                      </label>
                      <input
                        type="text"
                        {...register("nombre")}
                        className={`w-full px-4 py-3 rounded-lg border ${
                          errors.nombre ? "border-red-500" : "border-gray-300"
                        } focus:ring-2 focus:ring-primary focus:border-transparent transition-all`}
                        placeholder="Tu nombre"
                      />
                      {errors.nombre && (
                        <p className="text-red-500 text-sm mt-1">{errors.nombre.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Empresa / Negocio (opcional)
                      </label>
                      <input
                        type="text"
                        {...register("empresa")}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        placeholder="Nombre de tu empresa"
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          {...register("email")}
                          className={`w-full px-4 py-3 rounded-lg border ${
                            errors.email ? "border-red-500" : "border-gray-300"
                          } focus:ring-2 focus:ring-primary focus:border-transparent transition-all`}
                          placeholder="tu@email.com"
                        />
                        {errors.email && (
                          <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Teléfono *
                        </label>
                        <input
                          type="tel"
                          {...register("telefono")}
                          className={`w-full px-4 py-3 rounded-lg border ${
                            errors.telefono ? "border-red-500" : "border-gray-300"
                          } focus:ring-2 focus:ring-primary focus:border-transparent transition-all`}
                          placeholder="300 123 4567"
                        />
                        {errors.telefono && (
                          <p className="text-red-500 text-sm mt-1">{errors.telefono.message}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo de consulta *
                      </label>
                      <select
                        {...register("tipo")}
                        className={`w-full px-4 py-3 rounded-lg border ${
                          errors.tipo ? "border-red-500" : "border-gray-300"
                        } focus:ring-2 focus:ring-primary focus:border-transparent transition-all`}
                      >
                        <option value="">Selecciona una opción</option>
                        <option value="pedido">Realizar un pedido</option>
                        <option value="distribucion">Distribuidor / Mayoreo</option>
                        <option value="otro">Otro</option>
                      </select>
                      {errors.tipo && (
                        <p className="text-red-500 text-sm mt-1">{errors.tipo.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mensaje *
                      </label>
                      <textarea
                        {...register("mensaje")}
                        rows={4}
                        className={`w-full px-4 py-3 rounded-lg border ${
                          errors.mensaje ? "border-red-500" : "border-gray-300"
                        } focus:ring-2 focus:ring-primary focus:border-transparent transition-all`}
                        placeholder="Cuéntanos cómo podemos ayudarte..."
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
                      {isSubmitting ? "Enviando..." : "Enviar mensaje"}
                    </button>
                  </form>

                  {/* Notificaciones */}
                  <AnimatePresence>
                    {submitStatus === "success" && (
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        className="mt-5 rounded-2xl overflow-hidden border border-green-200"
                      >
                        {/* Éxito */}
                        <div className="bg-green-50 px-5 py-4 flex items-start gap-3">
                          <span className="text-2xl">✅</span>
                          <div>
                            <p className="font-semibold text-green-800">¡Mensaje enviado!</p>
                            <p className="text-sm text-green-700 mt-0.5">
                              Te respondemos pronto. También podés escribirnos directo por WhatsApp.
                            </p>
                          </div>
                        </div>
                        {/* CTA WhatsApp */}
                        {whatsappUrl && (
                          <div className="bg-white px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                            <p className="text-sm text-gray-600">
                              ¿Querés una respuesta más rápida?
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
                              Continuar por WhatsApp
                            </a>
                          </div>
                        )}
                      </motion.div>
                    )}
                    {submitStatus === "error" && (
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        className="mt-5 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3"
                      >
                        <span className="text-xl">❌</span>
                        <p className="text-sm">Hubo un error al enviar. Por favor intentá de nuevo.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Map and Sales Points */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-8"
              >
                {/* Google Maps Embed */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3976.0594403719875!2d-74.06595492426023!3d4.711353550194793!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e3f9a6c0c0c0c0c!2sBogot%C3%A1,+Colombia!5e0!3m2!1ses!2sco!4v1704067200000!5m2!1ses!2sco"
                    width="100%"
                    height="300"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Ubicación Mas Cerca Ap"
                  />
                </div>

                {/* Sales Points */}
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h3 className="text-xl font-bold text-gray-800 mb-6">
                    Puntos de Venta
                  </h3>
                  <div className="space-y-4">
                    {salesPoints.map((point) => (
                      <div
                        key={point.id}
                        className="flex gap-4 p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">{point.name}</h4>
                          <p className="text-sm text-gray-600">{point.address}</p>
                          <p className="text-sm text-gray-500">{point.neighborhood}</p>
                          <p className="text-sm text-primary mt-1">{point.schedule}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
    </div>
  );
}