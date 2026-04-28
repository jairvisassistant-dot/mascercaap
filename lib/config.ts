// lib/config.ts — Fuente de verdad para datos de contacto y URLs del sitio.
// Importar desde aquí. NO duplicar estos valores en otros archivos.

export const SITE_CONFIG = {
  /** Número de WhatsApp para links wa.me — sin +, sin espacios */
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "573219054984",
  /** Teléfono formateado para mostrar en UI */
  phoneDisplay: "+57 321 905 4984",
  /** Teléfono con guiones para JSON-LD y atributos tel: */
  phoneTel: "+57-321-905-4984",
  /** Email de contacto general */
  emailContact: "apalejandraplata@gmail.com",
  /** URL canónica del sitio */
  siteUrl: "https://mascercap.com",
  /** Redes sociales — dejar vacío ("") para ocultar el ícono */
  socialInstagram: "https://instagram.com/mas_cerca_ap",
  socialFacebook: "https://web.facebook.com/profile.php?id=61568005678877&mibextid=wwXIfr&rdid=VAKmdaUWKREJLS9X&share_url=https%3A%2F%2Fweb.facebook.com%2Fshare%2F18KW5ddkJ9%2F%3Fmibextid%3DwwXIfr%26_rdc%3D1%26_rdr",
  socialTikTok: "",
  /** Dirección física de la bodega */
  address: "Calle 12a # 15-53, Chia",
  /** Localidad y ciudad */
  addressCity: "Cundinamarca, Colombia",
} as const;
