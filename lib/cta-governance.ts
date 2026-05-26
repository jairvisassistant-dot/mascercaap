export type CTAVariant = "primary" | "secondary" | "tertiary";

export type CTABlockPolicy = {
  blockId: string;
  blockLabel: string;
  route: string;
  goal: string;
  primaryCta: {
    label: string;
    destination: string;
    variant: CTAVariant;
  };
  secondaryCtas?: Array<{
    label: string;
    destination: string;
    variant: Exclude<CTAVariant, "primary">;
  }>;
  notes?: string;
};

export const CTA_GOVERNANCE: CTABlockPolicy[] = [
  {
    blockId: "home-final-cta",
    blockLabel: "Home — cierre de página",
    route: "/[lang]",
    goal: "Abrir conversación comercial de alta intención.",
    primaryCta: {
      label: "WhatsApp / Start order",
      destination: "WhatsApp drawer or direct WA handoff",
      variant: "primary",
    },
    notes: "Los chips informativos no cuentan como CTA accionable.",
  },
  {
    blockId: "products-whatsapp-banner",
    blockLabel: "Productos — banner de ayuda rápida",
    route: "/[lang]/productos",
    goal: "Resolver dudas rápidas sin competir con el cierre comercial principal.",
    primaryCta: {
      label: "Contact us for personalized advice",
      destination: "WhatsApp",
      variant: "secondary",
    },
    notes: "Este bloque existe para soporte; no debe convertirse en CTA primario visual.",
  },
  {
    blockId: "products-closing-cta",
    blockLabel: "Productos — cierre comercial",
    route: "/[lang]/productos",
    goal: "Llevar al usuario a la página de contacto/pedido.",
    primaryCta: {
      label: "Go to contact / request quote",
      destination: "/[lang]/contacto",
      variant: "primary",
    },
  },
  {
    blockId: "about-cta",
    blockLabel: "Nosotros — CTA institucional",
    route: "/[lang]/nosotros",
    goal: "Derivar a contacto comercial luego de construir confianza.",
    primaryCta: {
      label: "Ir a contacto",
      destination: "/[lang]/contacto",
      variant: "primary",
    },
  },
  {
    blockId: "contact-form",
    blockLabel: "Contacto — formulario principal",
    route: "/[lang]/contacto",
    goal: "Enviar solicitud comercial completa.",
    primaryCta: {
      label: "Enviar solicitud",
      destination: "POST /api/contact",
      variant: "primary",
    },
    secondaryCtas: [
      {
        label: "WhatsApp fallback",
        destination: "WhatsApp",
        variant: "secondary",
      },
    ],
  },
  {
    blockId: "legal-contact-cta",
    blockLabel: "Términos/Políticas — contacto legal",
    route: "/[lang]/terminos + /[lang]/politicas",
    goal: "Resolver dudas legales y de privacidad.",
    primaryCta: {
      label: "Ir a contacto",
      destination: "/[lang]/contacto",
      variant: "primary",
    },
    secondaryCtas: [
      {
        label: "Email legal",
        destination: "mailto",
        variant: "tertiary",
      },
    ],
  },
];

export function getRouteCtaPolicies(route: string) {
  return CTA_GOVERNANCE.filter((policy) => policy.route.includes(route));
}
