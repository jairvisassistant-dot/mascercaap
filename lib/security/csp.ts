const SHARED_DIRECTIVES = {
  defaultSrc: "default-src 'self'",
  imgSrc: "img-src 'self' data: blob: https://images.unsplash.com https://api.qrserver.com https://*.supabase.co",
  fontSrc: "font-src 'self' data:",
  connectSrc: "connect-src 'self' https://*.supabase.co https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com",
  frameSrc: "frame-src https://maps.google.com https://www.google.com",
  frameAncestors: "frame-ancestors 'none'",
  objectSrc: "object-src 'none'",
  baseUri: "base-uri 'self'",
  formAction: "form-action 'self'",
  reportUri: "report-uri /api/csp-report",
};

function joinDirectives(directives: string[]) {
  return directives.join("; ");
}

/**
 * Enforced CSP — served on every request.
 * Keeps 'unsafe-inline' as fallback for pages not covered by middleware
 * (e.g. cached static responses). When middleware runs, the nonce is preferred.
 */
export function buildEnforcedCsp(isDev: boolean, nonce?: string) {
  const nonceClause = nonce ? ` 'nonce-${nonce}'` : "";

  const scriptSrc = isDev
    ? `script-src 'self' 'unsafe-inline' 'unsafe-eval'${nonceClause} https://www.googletagmanager.com`
    : `script-src 'self' 'unsafe-inline'${nonceClause} https://www.googletagmanager.com`;

  return joinDirectives([
    SHARED_DIRECTIVES.defaultSrc,
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    SHARED_DIRECTIVES.imgSrc,
    SHARED_DIRECTIVES.fontSrc,
    SHARED_DIRECTIVES.connectSrc,
    SHARED_DIRECTIVES.frameSrc,
    SHARED_DIRECTIVES.frameAncestors,
    SHARED_DIRECTIVES.objectSrc,
    SHARED_DIRECTIVES.baseUri,
    SHARED_DIRECTIVES.formAction,
    SHARED_DIRECTIVES.reportUri,
  ]);
}

/**
 * Report-Only CSP — stricter policy for progressive hardening.
 * Eliminates script violations via nonce (no 'unsafe-inline' for scripts).
 * Keeps 'unsafe-inline' for style-src: Framer Motion requires inline style
 * attributes and style injection doesn't enable code execution.
 */
export function buildReportOnlyCsp(isDev: boolean, nonce?: string): string | null {
  if (isDev) return null;

  const nonceClause = nonce ? ` 'nonce-${nonce}'` : "";

  return joinDirectives([
    SHARED_DIRECTIVES.defaultSrc,
    `script-src 'self'${nonceClause} https://www.googletagmanager.com`,
    "style-src 'self' 'unsafe-inline'",
    SHARED_DIRECTIVES.imgSrc,
    SHARED_DIRECTIVES.fontSrc,
    SHARED_DIRECTIVES.connectSrc,
    SHARED_DIRECTIVES.frameSrc,
    SHARED_DIRECTIVES.frameAncestors,
    SHARED_DIRECTIVES.objectSrc,
    SHARED_DIRECTIVES.baseUri,
    SHARED_DIRECTIVES.formAction,
    SHARED_DIRECTIVES.reportUri,
  ]);
}
