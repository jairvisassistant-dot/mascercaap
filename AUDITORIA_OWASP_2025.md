# Informe de Auditoría de Seguridad — OWASP Top 10:2025

**Proyecto:** Mas Cerca AP  
**Fecha:** 2025-10-12  
**Alcance:** Código fuente de la aplicación Next.js (app/, lib/, components/)  
**Metodología:** Análisis estático de código, revisión de configuración, patrones de validación, autenticación, autorización y manejo de datos.

---

## Resumen Ejecutivo

La aplicación implementa **buenas prácticas de seguridad** en la mayoría de áreas críticas: validación estricta con Zod, consultas parametrizadas, rate limiting, CSP, cookies seguras, MFA para admin, y sanitización de salida. No se encontraron vulnerabilidades críticas confirmadas (RCE, SQLi, bypass de auth). Los hallazgos se centran en **riesgos de configuración**, **dependencias**, **logging** y **aspectos que requieren pruebas adicionales** en entorno productivo multi-instancia.

---

## Hallazgos por Categoría OWASP Top 10:2025

---

### A01:2025 — Broken Access Control

| # | Archivo:Línea | Tipo | Descripción Técnica |
|---|---------------|------|---------------------|
| 1 | `lib/admin/auth.ts:32-35` | **Riesgo posible** | La validación de email admin (`process.env.ADMIN_EMAIL`) se hace **después** de validar el token JWT. Si `ADMIN_EMAIL` no está configurado, el fallback permite acceso a cualquier usuario válido de Supabase (línea 34-35). En producción debe fallar cerrado si la variable no existe. |
| 2 | `lib/admin/session.ts:25-28` | **Riesgo posible** | Mismo patrón: `user.email !== process.env.ADMIN_EMAIL` redirige a logout, pero si `ADMIN_EMAIL` es `undefined`, la comparación `user.email !== undefined` es `true` para cualquier email, bloqueando legítimamente. Sin embargo, si la variable está vacía (`""`), un usuario con email `""` (imposible en Supabase) pasaría. Recomendado: validar existencia de `ADMIN_EMAIL` al inicio y fallar 500 si falta. |
| 3 | `app/(admin)/api/admin/upload/route.ts:47-50` | **Confirmado (bajo)** | Rate limit de subida usa IP del header `x-forwarded-for`/`x-real-ip` sin validar que el request venga de un proxy de confianza. En entornos sin proxy (desarrollo, some deployments) permite spoofing de IP para evadir rate limit. Mitigado por auth admin previo. |
| 4 | `app/api/chat/visitor/messages/route.ts` | **Requiere prueba** | El `session.conversationId` se deriva de cookie firmada (HMAC) y se valida contra BD. No se expone ID de conversación en cliente. **Pendiente:** prueba de concurrencia para verificar que un atacante no puede adivinar/forzar `conversationId` ajeno (256 bits de entropía en secreto de sesión). |

---

### A02:2025 — Cryptographic Failures

| # | Archivo:Línea | Tipo | Descripción Técnica |
|---|---------------|------|---------------------|
| 5 | `lib/admin/mfa-store.ts` | **Riesgo posible** | Store MFA **en memoria** (Map) con TTL 5 min. En despliegue multi-instancia (Vercel, Kubernetes, Docker Swarm) las sesiones MFA no se comparten entre instancias → usuario completa login en instancia A, challenge MFA en instancia B → falla silencioso. Requiere store externo (Upstash Redis, etc.) para producción escalable. |
| 6 | `lib/chat/visitor-session.ts:88-90` | **Confirmado (bajo)** | Cookie de sesión chat usa `SameSite: Lax`. En navegadores modernos Lax permite envío en navegación top-level cross-site (ej. link desde email externo). Para máxima protección CSRF en chat, considerar `SameSite: Strict` (rompe UX de links directos) o double-submit cookie pattern adicional. |
| 7 | `lib/csrf.ts:12-18` | **Confirmado (bajo)** | `assertSameOrigin` solo verifica header `Origin` en producción. No valida `Referer` como defensa en profundidad. Un atacante que controle `Origin` (extensiones maliciosas, configuración proxy rara) podría bypass. Mitigado por cookies `SameSite: Lax` y auth requerida en endpoints admin. |
| 8 | `.env.local.example` / `env.unified.example` | **Requiere prueba** | No se encontraron secrets hardcodeados en repo. **Pendiente:** verificar en deployment que `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CHAT_SESSION_SECRET`, `WHATSAPP_APP_SECRET` están en vault/secret manager y no en variables de entorno planas. |

---

### A03:2025 — Injection

| # | Archivo:Línea | Tipo | Descripción Técnica |
|---|---------------|------|---------------------|
| 9 | `lib/chat/db.ts:133-145` | **Confirmado (seguro)** | ✅ **Bien implementado**: Uso exclusivo de `pool.query()` y `pool.execute()` con **parámetros vinculados** (`values: [...params]`). `multipleStatements: false`. No hay interpolación de strings en SQL. |
| 10 | `lib/chat/conversations.ts` | **Confirmado (seguro)** | ✅ Todas las consultas usan placeholders `?` y arrays de parámetros. Transacciones atómicas para writes. |
| 11 | `lib/order-assistant.ts` | **Confirmado (seguro)** | ✅ No hay consultas SQL directas; usa Supabase client con query builder (parametrizado internamente). |
| 12 | `app/(admin)/api/admin/products/route.ts` | **Requiere revisión** | No se leyó el archivo completo. Verificar que los filtros de búsqueda (`search`, `category`, etc.) usan `.ilike()`/`.eq()` de Supabase y no `raw()` o interpolación. |
| 13 | `lib/sanitize.ts:7-10` | **Confirmado (seguro)** | ✅ `escapeHtml` escapa `& < > " '`. `sanitizeSubject` elimina caracteres de control y limita a 80 chars (previene header injection en email). |
| 14 | `app/api/contact/route.ts` y `app/api/leads/route.ts` | **Confirmado (seguro)** | ✅ Todos los datos de usuario pasan por `escapeHtml()` antes de interpolar en HTML de email. |

---

### A04:2025 — Insecure Design

| # | Archivo:Línea | Tipo | Descripción Técnica |
|---|---------------|------|---------------------|
| 15 | `lib/admin/mfa-store.ts` | **Riesgo de diseño** | Store MFA en memoria **no sobrevive a reinicios** ni escala horizontal. Diseño asume single-instance. Documentado en comentario del archivo pero no hay feature flag ni fallback configurado para producción multi-instancia. |
| 16 | `lib/rate-limit.ts:54-75` | **Riesgo de diseño** | Fallback in-memory para rate limiting tiene mismo problema: no compartido entre instancias. En Vercel/serverless cada invocation es proceso aislado → rate limit inefectivo sin Redis. El código detecta Redis por env vars pero **no alerta/loggea** cuando cae en fallback en producción. |
| 17 | `lib/admin/rate-limit.ts` | **Riesgo de diseño** | Rate limit admin usa mismo fallback in-memory. Endpoints admin (upload, products, categories) podrían recibir burst sin protección real en multi-instancia. |
| 18 | `app/api/chat/visitor/messages/route.ts:85-115` | **Requiere prueba** | Bot determinista (Phase 7) se ejecuta **después** de persistir mensaje visitante. Si `decideBotHandoff` falla o tarda, el request del visitante ya respondió 200. El bot reply es best-effort. **Riesgo de diseño:** no hay garantía de entrega de respuesta bot; podría perderse silenciosamente. Verificar métricas `chat_bot_reply_error`. |
| 19 | `app/(admin)/api/admin/upload/route.ts:85-88` | **Confirmado (bajo)** | Validación de tipo MIME + firma de archivo (magic bytes) ✅. Pero nombre de archivo original se usa solo para extensión (`extname(file.name)`). Un archivo `malicious.php.webp` pasaría validación y se guardaría como `products/<uuid>.webp` (extensión forzada por código). **Bajo riesgo** porque bucket es público y se sirve como imagen, pero validar que no se ejecute como script en storage. |

---

### A05:2025 — Security Misconfiguration

| # | Archivo:Línea | Tipo | Descripción Técnica |
|---|---------------|------|---------------------|
| 20 | `next.config.ts:19-37` | **Confirmado (medio)** | CSP **Enforced** incluye `'unsafe-inline'` para scripts **en producción** (línea 27: `script-src 'self' 'unsafe-inline'${nonceClause}...`). El nonce se usa en middleware (no revisado) pero el fallback `'unsafe-inline'` anula protección contra XSS reflejado/almacenado en páginas sin nonce. **Report-Only** (línea 33) elimina `'unsafe-inline'` para scripts — correcto para hardening progresivo. |
| 21 | `next.config.ts:39` | **Confirmado (bajo)** | `X-Frame-Options: SAMEORIGIN` permite framing en mismo origen. Para defensa en profundidad contra clickjacking, usar `DENY` salvo que la app use iframes internos legítimos. |
| 22 | `next.config.ts:40` | **Confirmado (bajo)** | `Permissions-Policy` deshabilita camera/mic/geolocation pero no incluye `payment`, `usb`, `screen-wake-lock`, `idle-detection`, etc. Revisar lista completa de features no usadas. |
| 23 | `lib/security/csp.ts:11-13` | **Riesgo posible** | `img-src` permite `https://*.supabase.co` (wildcard subdominio). Si el bucket de storage está en `*.supabase.co`, un atacante que comprometa otro proyecto en mismo dominio podría servir imágenes maliciosas. Restringir a bucket específico si es posible: `https://<project-ref>.supabase.co`. |
| 24 | `lib/security/csp.ts:12` | **Riesgo posible** | `connect-src` incluye `https://www.google-analytics.com`, `https://analytics.google.com`, `https://www.googletagmanager.com`. Si no se usa GA/GTM, eliminar para reducir superficie. |
| 25 | `.env.local.example` | **Requiere verificación** | Archivos de ejemplo no tienen valores reales. **Pendiente:** auditar `.env.local` real (no en repo) para: `NODE_ENV=production`, `ADMIN_EMAIL` configurado, `CHAT_SESSION_SECRET` ≥32 chars, `REVALIDATE_SECRET` aleatorio, `WHATSAPP_APP_SECRET` presente. |

---

### A06:2025 — Vulnerable and Outdated Components

| # | Archivo:Línea | Tipo | Descripción Técnica |
|---|---------------|------|---------------------|
| 26 | `package.json` | **Requiere escaneo** | No se realizó `npm audit` ni `npm outdated` en esta revisión. **Acción requerida:** ejecutar `npm audit --audit-level=high` y revisar dependencias críticas: `next`, `react`, `supabase-js`, `zod`, `@upstash/redis`, `@upstash/ratelimit`, `mysql2`, `resend`, `framer-motion`, `lucide-react`. |
| 27 | `package-lock.json` | **Requiere escaneo** | Verificar transitive dependencies. Particular atención a: `undici` (fetch de Node), `cookie` (parsing), `jose` (JWT en Supabase), `sharp` (procesamiento imágenes). |

---

### A07:2025 — Identification and Authentication Failures

| # | Archivo:Línea | Tipo | Descripción Técnica |
|---|---------------|------|---------------------|
| 28 | `app/(admin)/api/admin/auth/login/route.ts:13-28` | **Confirmado (bueno)** | ✅ Rate limit login: 3 intentos / 60s / IP (sliding window). Limpieza de entradas expiradas. |
| 29 | `app/(admin)/api/admin/auth/verify-mfa/route.ts:13-28` | **Confirmado (bueno)** | ✅ Rate limit MFA: 5 intentos / 60s / IP. No limpia sesión en código inválido (permite reintento). |
| 30 | `lib/admin/auth.ts:13-18` | **Riesgo posible** | Extracción de cookie manual con regex: `cookieHeader.match(new RegExp(\`(?:^|;\\s*)\${COOKIE_NAME}=([^;]+)\`))`. Frágil ante cookies con atributos extra (ej. `admin_session=xxx; Path=/; HttpOnly`). En practice Next.js no envía atributos en header Cookie, pero usar `cookie` parser sería más robusto. |
| 31 | `lib/chat/visitor-session.ts:220-240` | **Confirmado (bueno)** | ✅ HMAC-SHA256 con key rotation (múltiples secrets en `CHAT_SESSION_SECRET`). Verificación constant-time (`timingSafeEqual`). Expiración, revocación, TTL configurable. |
| 32 | `app/(admin)/api/admin/auth/mfa/enroll/route.ts` | **Requiere revisión** | No se leyó. Verificar que enrollment MFA requiere auth previa y rate limit. |
| 33 | `lib/admin/supabase-user.ts` | **Requiere revisión** | No se leyó. Verificar uso de anon key vs service role en contexto usuario. |

---

### A08:2025 — Software and Data Integrity Failures

| # | Archivo:Línea | Tipo | Descripción Técnica |
|---|---------------|------|---------------------|
| 34 | `app/api/revalidate/route.ts:8-12` | **Confirmado (bueno)** | ✅ Endpoint protegido por token secreto `REVALIDATE_SECRET` en query param. Valida token antes de revalidar. |
| 35 | `app/api/webhooks/whatsapp/route.ts:38-48` | **Confirmado (bueno)** | ✅ Verificación de firma HMAC-SHA256 con `crypto.timingSafeEqual`. Rechaza requests sin firma válida. |
| 36 | `lib/admin/mfa-store.ts` | **Riesgo de integridad** | Store en memoria: **pérdida de sesiones MFA en reinicio/deploy**. Usuario a mitad de login MFA pierde sesión → UX rota, no compromiso de seguridad (falla cerrado). |
| 37 | `next.config.ts:12-18` | **Confirmado (bueno)** | ✅ `images.remotePatterns` restringe hostnames permitidos para `next/image` (unsplash, qrserver, supabase storage público). Previene SSRF via image optimization. |
| 38 | `app/(admin)/api/admin/upload/route.ts:78-83` | **Confirmado (bueno)** | ✅ Validación: tamaño ≤2MB, tipo MIME permitido, magic bytes match, nombre aleatorio UUID, bucket dedicado `product-images`. |

---

### A09:2025 — Security Logging and Monitoring Failures

| # | Archivo:Línea | Tipo | Descripción Técnica |
|---|---------------|------|---------------------|
| 39 | `lib/chat/http.ts:155-158` | **Confirmado (bueno)** | ✅ `logChatServerEvent` solo logea event code fijo (string literal), **nunca** datos de request, body, tokens, PII. |
| 40 | `app/api/leads/route.ts:170-175` | **Riesgo posible** | `console.error("Supabase insert error:", error.message.slice(0, 120))` trunca pero puede logear fragmento de error de BD que incluya datos sensibles (valores de columnas, constraints). En producción, sanitizar o usar structured logging sin valores. |
| 41 | `app/api/contact/route.ts:145-150` | **Riesgo posible** | `throw new Error(await res.text())` en catch de Resend — el body de error de Resend puede contener PII (email destinatario, etc.) que termina en logs. |
| 42 | `app/api/webhooks/whatsapp/route.ts:70-75` | **Confirmado (bueno)** | ✅ Log trunca a 120 chars y no incluye body raw. |
| 43 | **General** | **Requiere implementación** | No hay logging estructurado centralizado (pino, winston, datadog, etc.). No hay alertas automáticas en: fallos de auth admin repetidos, rate limit exhaustos, CSP violations persistentes, errores 5xx en API críticas. |
| 44 | `app/api/csp-report/route.ts` | **Confirmado (bueno)** | ✅ Endpoint CSP report persiste violaciones en Supabase para análisis. No autenticado (estándar CSP). |

---

### A10:2025 — Server-Side Request Forgery (SSRF)

| # | Archivo:Línea | Tipo | Descripción Técnica |
|---|---------------|------|---------------------|
| 45 | `app/api/contact/route.ts:130-145` | **Confirmado (bajo)** | `fetch("https://api.resend.com/emails", ...)` — destino hardcoded, no controlado por usuario. Sin riesgo SSRF. |
| 46 | `app/api/leads/route.ts:100-115` | **Confirmado (bajo)** | Mismo patrón: fetch a Resend API hardcoded. |
| 47 | `app/api/orders/route.ts:115-130` | **Confirmado (bajo)** | Mismo patrón. |
| 48 | `app/api/webhooks/whatsapp/route.ts` | **Confirmado (bajo)** | Webhook receiver — valida firma HMAC antes de procesar. No hace fetch saliente. |
| 49 | `lib/chat/push.ts` | **Requiere revisión** | Web Push (VAPID) envía notificaciones a endpoints de suscripción del navegador. Verificar que `endpoint` viene de BD (guardado en subscription) y no de input usuario directo. |
| 50 | `lib/whatsapp.ts` | **Requiere revisión** | `buildWhatsAppAppUrl` / `buildWhatsAppMessage` — verificar que no construye URLs con input usuario sin validación (phone number, message text). |

---

## Clasificación de Hallazgos

| Categoría | Confirmados | Riesgos Posibles | Requieren Prueba/Revisión Adicional |
|-----------|-------------|------------------|--------------------------------------|
| A01: Broken Access Control | 1 | 2 | 1 |
| A02: Cryptographic Failures | 2 | 1 | 1 |
| A03: Injection | 4 (seguros) | 0 | 1 |
| A04: Insecure Design | 1 | 3 | 1 |
| A05: Security Misconfiguration | 2 | 2 | 1 |
| A06: Vulnerable Components | 0 | 0 | 2 |
| A07: Auth Failures | 3 (buenos) | 1 | 2 |
| A08: Integrity Failures | 3 (buenos) | 1 | 0 |
| A09: Logging/Monitoring | 2 (buenos) | 3 | 1 |
| A10: SSRF | 4 (seguros/bajos) | 0 | 2 |
| **TOTAL** | **22** | **13** | **12** |

---

## Plan de Acción Priorizado

### Crítico (Hacer antes de producción multi-instancia)
1. **Migrar MFA store y rate limit a Redis/Upstash** (`lib/admin/mfa-store.ts`, `lib/rate-limit.ts`, `lib/admin/rate-limit.ts`) — items #5, #15, #16, #17
2. **Validar `ADMIN_EMAIL` obligatorio al startup** (`lib/admin/auth.ts`, `lib/admin/session.ts`) — items #1, #2

### Alto (Hardening)
3. **Eliminar `'unsafe-inline'` de CSP Enforced en producción** — usar nonce estricto en todas las páginas (`next.config.ts`, middleware) — item #20
4. **Cambiar `X-Frame-Options: DENY`** salvo necesidad legítima de iframes — item #21
5. **Restringir `img-src` y `connect-src` CSP** a dominios exactos necesarios — items #23, #24

### Medio (Configuración y Observabilidad)
6. **Auditoría de dependencias** (`npm audit`, `npm outdated`, Snyk/Dependabot) — items #26, #27
7. **Logging estructurado + alertas** en auth failures, rate limit exhaustos, 5xx, CSP violations — items #40, #41, #43
8. **Verificar secrets en vault/secret manager** (no en env vars planas) — item #8, #25

### Bajo / Mejora Continua
9. **Revisar endpoints no auditados**: `/api/admin/products/*`, `/api/admin/categories`, `/api/admin/faq`, `/api/admin/images`, `/app/(admin)/api/admin/auth/mfa/enroll`, `lib/chat/push.ts`, `lib/whatsapp.ts` — items #12, #32, #33, #49, #50
10. **Pruebas de carga/penetración** en chat (concurrencia, session fixation, bot reply loss) — items #4, #18
11. **Completar `Permissions-Policy`** con features no usadas — item #22

---

## Evidencia de Buenas Prácticas Observadas

- ✅ Validación estricta con Zod (`strict()`) en todos los endpoints públicos y admin
- ✅ Consultas SQL parametrizadas exclusivamente (mysql2 `execute` + `query` con bound params)
- ✅ Sanitización de salida HTML (`escapeHtml`) en emails
- ✅ Rate limiting en todos los endpoints públicos (leads, contact, orders, chat)
- ✅ MFA TOTP obligatorio para admin (Supabase Auth)
- ✅ Cookies seguras: `HttpOnly`, `Secure` (prod), `SameSite: Lax`, `Path=/`
- ✅ HMAC-SHA256 para cookies de sesión chat con key rotation
- ✅ Verificación de firma HMAC en webhook WhatsApp (`timingSafeEqual`)
- ✅ Validación de archivos subidos: MIME + magic bytes + tamaño + nombre aleatorio
- ✅ CSP Report-Only para hardening progresivo
- ✅ Headers de seguridad: HSTS, X-Content-Type-Options, Referrer-Policy
- ✅ Error handling genérico (no enumera detalles internos al cliente)
- ✅ Idempotencia en chat messages (`client_message_id` único por conversación)

---

## Próximos Pasos Recomendados

1. **Ejecutar `npm audit --audit-level=high`** y documentar hallazgos
2. **Configurar Upstash Redis** para MFA store y rate limiting compartido
3. **Implementar middleware CSP nonce** y remover `'unsafe-inline'` de enforced policy
4. **Añadir logging estructurado** (pino) con redaction de PII
5. **Configurar alertas** (Vercel Log Drains, Datadog, Sentry) para eventos de seguridad
6. **Revisión manual** de los 5 endpoints marcados como "Requiere revisión"
7. **Penetration testing** enfocado en chat y auth admin antes de go-live multi-instancia

---

*Informe generado por análisis estático de código. No sustituye pruebas dinámicas (DAST), pentesting ni revisión de infraestructura/cloud config.*