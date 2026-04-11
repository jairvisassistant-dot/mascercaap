// lib/config.ts — Fuente de verdad para datos de contacto y URLs del sitio.
// Importar desde aquí. NO duplicar estos valores en otros archivos.

export const SITE_CONFIG = {
  /** Número de WhatsApp para links wa.me — sin +, sin espacios */
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "573001234567",
  /** Teléfono formateado para mostrar en UI */
  phoneDisplay: "+57 300 123 4567",
  /** Teléfono con guiones para JSON-LD y atributos tel: */
  phoneTel: "+57-300-123-4567",
  /** Email de contacto general */
  emailContact: "hola@mascercap.com",
  /** Email para pedidos */
  emailOrders: "pedidos@mascercap.com",
  /** URL canónica del sitio */
  siteUrl: "https://mascercap.com",
  /** Dirección física de la bodega */
  address: "Cl. 2a # 41-65, Barrio El Jazmín",
  /** Localidad y ciudad */
  addressCity: "Puente Aranda, Bogotá",
} as const;
