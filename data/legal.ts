import { SITE_CONFIG } from "@/lib/config";
import type { LegalDocument } from "@/types";

export const privacyPolicy: LegalDocument = {
  title: {
    es: "Política de Privacidad y Tratamiento de Datos",
    en: "Privacy Policy and Data Treatment",
  },
  lastUpdated: "2026-05-27",
  sections: [
    {
      title: { es: "1. Responsable del tratamiento", en: "1. Data Controller" },
      content: {
        es: "Mas Cerca AP, con domicilio en Calle 12a # 15-53, Chía, Cundinamarca, Colombia, es responsable del tratamiento de los datos personales recopilados a través de este sitio web.",
        en: "Mas Cerca AP, located at Calle 12a # 15-53, Chía, Cundinamarca, Colombia, is responsible for the processing of personal data collected through this website.",
      },
    },
    {
      title: { es: "2. Datos que recopilamos", en: "2. Data We Collect" },
      content: {
        es: "Recopilamos nombre completo, dirección de correo electrónico, número de teléfono, nombre de empresa (opcional) y el contenido del mensaje enviado a través del formulario de contacto. No recopilamos datos sensibles.",
        en: "We collect full name, email address, phone number, company name (optional), and the content of messages sent through the contact form. We do not collect sensitive data.",
      },
    },
    {
      title: { es: "3. Finalidad del tratamiento", en: "3. Purpose of Processing" },
      content: {
        es: "Los datos se utilizan exclusivamente para: (a) responder solicitudes de contacto, pedidos o cotizaciones; (b) gestionar relaciones comerciales con distribuidores; (c) mejorar nuestros servicios. No vendemos ni cedemos datos a terceros.",
        en: "Data is used exclusively for: (a) responding to contact requests, orders, or quotes; (b) managing commercial relationships with distributors; (c) improving our services. We do not sell or transfer data to third parties.",
      },
    },
    {
      title: { es: "4. Base legal", en: "4. Legal Basis" },
      content: {
        es: "El tratamiento se realiza con base en la Ley 1581 de 2012 y el Decreto 1377 de 2013 de la República de Colombia. Al enviar el formulario de contacto, el usuario otorga su consentimiento expreso para el tratamiento de sus datos.",
        en: "Processing is based on Law 1581 of 2012 and Decree 1377 of 2013 of the Republic of Colombia. By submitting the contact form, the user grants explicit consent for the processing of their data.",
      },
    },
    {
      title: { es: "5. Derechos ARCO del titular", en: "5. Data Subject Rights (ARCO)" },
      content: {
        es: `El titular de los datos personales tiene derecho a Acceder, Rectificar, Cancelar y Oponerse al tratamiento de sus datos (derechos ARCO), así como a revocar la autorización otorgada en cualquier momento. Para ejercer cualquiera de estos derechos, puede escribirnos a ${SITE_CONFIG.emailContact}. Atenderemos su solicitud en los plazos establecidos por la Ley 1581 de 2012.`,
        en: `The data subject has the right to Access, Rectify, Cancel, and Object to the processing of their personal data (ARCO rights), as well as to withdraw consent at any time. To exercise any of these rights, you may write to us at ${SITE_CONFIG.emailContact}. We will respond to your request within the deadlines established by Law 1581 of 2012.`,
      },
    },
    {
      title: { es: "6. Conservación de datos", en: "6. Data Retention" },
      content: {
        es: "Los datos se conservan durante el tiempo necesario para cumplir con la finalidad del tratamiento y las obligaciones legales aplicables, sin exceder cinco (5) años desde la última interacción.",
        en: "Data is retained for as long as necessary to fulfill the purpose of processing and comply with applicable legal obligations, not exceeding five (5) years from the last interaction.",
      },
    },
    {
      title: { es: "7. Seguridad", en: "7. Security" },
      content: {
        es: "Implementamos medidas técnicas y organizativas adecuadas para proteger sus datos contra acceso no autorizado, alteración, divulgación o destrucción accidental.",
        en: "We implement appropriate technical and organizational measures to protect your data against unauthorized access, alteration, disclosure, or accidental destruction.",
      },
    },
    {
      title: { es: "8. Cambios a esta política", en: "8. Changes to This Policy" },
      content: {
        es: "Podemos actualizar esta política periódicamente. Cualquier cambio será publicado en esta página con la fecha de actualización. Le recomendamos revisarla con regularidad.",
        en: "We may update this policy periodically. Any changes will be posted on this page with the update date. We recommend reviewing it regularly.",
      },
    },
    {
      title: { es: "9. Analítica propia del sitio", en: "9. Own-Site Analytics" },
      content: {
        es: "Este sitio web utiliza un sistema de analítica propio (no Google Analytics ni servicios de terceros de rastreo) para medir el uso del sitio y mejorar la experiencia del usuario. Los datos recopilados incluyen: nombre del evento de interacción (por ejemplo, visualización de página, apertura del chat de ayuda, clic en WhatsApp), la URL de la página donde ocurrió el evento, la URL referente (si la hay) y propiedades adicionales del evento en formato anónimo. No se recopila información de identificación personal (nombre, email, teléfono) a través de este sistema. Los datos son almacenados en Supabase (plataforma de base de datos con certificación SOC 2) y se utilizan exclusivamente para fines estadísticos internos.",
        en: "This website uses its own analytics system (not Google Analytics or any third-party tracking service) to measure site usage and improve user experience. The data collected includes: the name of the interaction event (e.g., page view, help chat open, WhatsApp click), the URL of the page where the event occurred, the referring URL (if any), and additional anonymous event properties. No personally identifiable information (name, email, phone number) is collected through this system. Data is stored in Supabase (a SOC 2-certified database platform) and used exclusively for internal statistical purposes.",
      },
    },
    {
      title: { es: "10. Terceros proveedores de servicios", en: "10. Third-Party Service Providers" },
      content: {
        es: "Para operar este sitio web, utilizamos los siguientes proveedores externos que pueden procesar o almacenar datos personales: (a) Supabase: plataforma de base de datos donde se almacenan los datos del formulario de contacto y los eventos de analítica propia. Opera bajo estándares de seguridad SOC 2. (b) Resend: servicio de envío de correos electrónicos utilizado para el envío de confirmaciones y notificaciones derivadas de sus solicitudes. Cada proveedor actúa como encargado del tratamiento y está sujeto a sus propias políticas de privacidad y a los acuerdos de tratamiento de datos suscritos con Mas Cerca AP.",
        en: "To operate this website, we use the following external providers who may process or store personal data: (a) Supabase: a database platform where contact form data and own-site analytics events are stored. It operates under SOC 2 security standards. (b) Resend: an email delivery service used to send confirmations and notifications related to your requests. Each provider acts as a data processor and is subject to their own privacy policies and the data processing agreements entered into with Mas Cerca AP.",
      },
    },
  ],
};

export const termsAndConditions: LegalDocument = {
  title: {
    es: "Términos y Condiciones de Uso",
    en: "Terms and Conditions of Use",
  },
  lastUpdated: "2026-05-13",
  sections: [
    {
      title: { es: "1. Aceptación de los términos", en: "1. Acceptance of Terms" },
      content: {
        es: "Al acceder y usar este sitio web, usted acepta cumplir y estar sujeto a los presentes Términos y Condiciones. Si no está de acuerdo con alguno de estos términos, le pedimos que no utilice el sitio.",
        en: "By accessing and using this website, you agree to comply with and be bound by these Terms and Conditions. If you disagree with any of these terms, please do not use the site.",
      },
    },
    {
      title: { es: "2. Descripción del servicio", en: "2. Service Description" },
      content: {
        es: "Mas Cerca AP opera como plataforma informativa y de contacto para la distribución de zumos concentrados, pulpas de fruta y productos lácteos de origen colombiano. Las transacciones comerciales se formalizan directamente con nuestro equipo de ventas.",
        en: "Mas Cerca AP operates as an informational and contact platform for the distribution of concentrated zumos, fruit pulps, and dairy products of Colombian origin. Commercial transactions are formalized directly with our sales team.",
      },
    },
    {
      title: { es: "3. Uso aceptable", en: "3. Acceptable Use" },
      content: {
        es: "El usuario se compromete a utilizar el sitio de manera lícita y a no realizar actividades que puedan dañar, sobrecargar o deteriorar el funcionamiento del sitio, ni a interferir con el uso de otros usuarios.",
        en: "The user agrees to use the site lawfully and not to engage in activities that may damage, overload, or deteriorate the functioning of the site, or interfere with other users' use.",
      },
    },
    {
      title: { es: "4. Propiedad intelectual", en: "4. Intellectual Property" },
      content: {
        es: "Todo el contenido del sitio (textos, imágenes, logotipos, diseños) es propiedad de Mas Cerca AP o de sus respectivos propietarios. Queda prohibida su reproducción total o parcial sin autorización expresa.",
        en: "All content on the site (texts, images, logos, designs) is the property of Mas Cerca AP or their respective owners. Reproduction in whole or in part without express authorization is prohibited.",
      },
    },
    {
      title: { es: "5. Pedidos y disponibilidad", en: "5. Orders and Availability" },
      content: {
        es: "Los productos mostrados en el sitio están sujetos a disponibilidad. Mas Cerca AP se reserva el derecho de modificar precios, cantidades mínimas de pedido y zonas de distribución, notificando a los clientes con al menos 15 días de antelación a través de los canales de comunicación registrados.",
        en: "Products shown on the site are subject to availability. Mas Cerca AP reserves the right to modify prices, minimum order quantities, and distribution areas, with at least 15 days' prior notice to customers through their registered communication channels.",
      },
    },
    {
      title: { es: "6. Limitación de responsabilidad", en: "6. Limitation of Liability" },
      content: {
        es: "Mas Cerca AP no será responsable por daños indirectos, incidentales o consecuentes derivados del uso o imposibilidad de uso del sitio. La información publicada es de carácter referencial.",
        en: "Mas Cerca AP shall not be liable for indirect, incidental, or consequential damages arising from the use or inability to use the site. Published information is for reference purposes.",
      },
    },
    {
      title: { es: "7. Legislación aplicable", en: "7. Applicable Law" },
      content: {
        es: "Estos términos se rigen por las leyes de la República de Colombia. Cualquier controversia se someterá a la jurisdicción de los tribunales competentes de Cundinamarca, Colombia.",
        en: "These terms are governed by the laws of the Republic of Colombia. Any dispute shall be subject to the jurisdiction of the competent courts of Cundinamarca, Colombia.",
      },
    },
    {
      title: { es: "8. Contacto", en: "8. Contact" },
      content: {
        es: `Para consultas sobre estos términos, puede contactarnos en: ${SITE_CONFIG.emailContact} | ${SITE_CONFIG.address}, ${SITE_CONFIG.addressCity}.`,
        en: `For inquiries about these terms, you may contact us at: ${SITE_CONFIG.emailContact} | ${SITE_CONFIG.address}, ${SITE_CONFIG.addressCity}.`,
      },
    },
  ],
};
