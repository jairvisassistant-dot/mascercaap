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

export function buildEnforcedCsp(isDev: boolean) {
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com"
    : "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com";

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

export function buildReportOnlyCsp(isDev: boolean) {
  if (isDev) return null;

  return joinDirectives([
    SHARED_DIRECTIVES.defaultSrc,
    "script-src 'self' https://www.googletagmanager.com",
    "style-src 'self'",
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
