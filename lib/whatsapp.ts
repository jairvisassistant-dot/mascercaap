type WhatsAppMessageLine = string | null | undefined;

export function buildWhatsAppMessage(lines: WhatsAppMessageLine[]): string {
  return lines.filter((line): line is string => Boolean(line)).join("\n");
}

export function buildWhatsAppAppUrl(phoneNumber: string | null | undefined, message: string): string | null {
  if (!phoneNumber) return null;
  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppWebUrl(phoneNumber: string | null | undefined, message: string): string | null {
  if (!phoneNumber) return null;
  return `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppLinks(phoneNumber: string | null | undefined, message: string) {
  return {
    appUrl: buildWhatsAppAppUrl(phoneNumber, message),
    webUrl: buildWhatsAppWebUrl(phoneNumber, message),
  };
}
