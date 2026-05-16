# Informe de Seguridad: Next.js y npm — Vulnerabilidades Recientes

**Proyecto:** Mas Cerca AP  
**Fecha:** 15 de mayo de 2026  
**Versión analizada:** Next.js 16.2.3  
**Versión parcheada recomendada:** Next.js 16.2.6

---

## 1. Resumen Ejecutivo

El proyecto Mas Cerca AP utiliza **Next.js 16.2.3**, una versión afectada por **13 vulnerabilidades de seguridad** publicadas entre diciembre de 2025 y mayo de 2026. De estas, **6 son de severidad alta o crítica** (CVSS >= 7.5), incluyendo un fallo de Server-Side Request Forgery (SSRF) con CVSS 8.6 que permite a un atacante no autenticado acceder a recursos internos del servidor.

La versión parcheada **Next.js 16.2.6** (publicada el 7 de mayo de 2026) resuelve todas las vulnerabilidades identificadas. Se recomienda la actualización inmediata.

---

## 2. Estado Actual del Proyecto

| Componente | Versión Actual | Versión Segura | Estado |
|------------|---------------|----------------|--------|
| `next` | 16.2.3 | >= 16.2.6 | VULNERABLE |
| `eslint-config-next` | 16.2.3 | >= 16.2.6 | VULNERABLE |
| `react` | 19.2.4 | 19.2.4 | OK |
| `react-dom` | 19.2.4 | 19.2.4 | OK |
| `postcss` (transitiva) | < 8.5.10 | >= 8.5.10 | VULNERABLE (XSS) |

**Características del proyecto relevantes para el análisis:**

- **Router:** App Router (no Pages Router)
- **Middleware:** No configurado (no existe `middleware.ts`)
- **Image Optimization:** Habilitada con formatos AVIF/WebP y 3 remote patterns
- **CSP:** Estática con `unsafe-inline`, sin nonces dinámicos
- **Cache Components / Partial Prerendering:** Requiere verificación
- **Server Actions:** Probablemente en uso (formularios con react-hook-form)

---

## 3. Vulnerabilidades de Next.js — Análisis Detallado

### 3.1. CVE-2026-44578 — SSRF via WebSocket Upgrade (CRÍTICA)

| Campo | Valor |
|-------|-------|
| **GHSA** | GHSA-c4j6-fc7j-m34r |
| **CVSS** | 8.6 / 10 (High) |
| **Vector** | AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:N/A:N |
| **CWE** | CWE-918 (Server-Side Request Forgery) |
| **Versiones afectadas** | >= 16.0.0, < 16.2.5 |
| **Versión corregida** | 16.2.5 |

**Descripción técnica:**

El handler de WebSocket upgrade en el servidor Node.js de Next.js no valida correctamente el header `X-Forwarded-Host`. Un atacante envía un request HTTP con headers:

```
GET /api/public HTTP/1.1
Host: victim-app.com
Connection: Upgrade
Upgrade: websocket
X-Forwarded-Host: http://169.254.169.254/latest/meta-data/
```

El servidor Next.js hace proxy del request al destino especificado, usando su propio contexto de red. Esto permite:

- Acceso a **cloud metadata endpoints** (AWS IMDSv1, GCP Metadata, Azure IMDS)
- Robo de **credenciales IAM, API tokens, secretos de deploy**
- Acceso a **paneles admin internos** no expuestos públicamente
- Pivoting dentro de la **red interna** del servidor

**Función vulnerable:** `initialize()` en `packages/next/src/server/lib/router-server.ts`

**Impacto para Mas Cerca AP:**

- **SI el proyecto está en Vercel:** NO afecta. La infraestructura edge de Vercel no usa el routing vulnerable.
- **SI el proyecto es self-hosted** (Docker, VPS, Kubernetes, servidor propio): **EXPUESTO**. ~79,000 instancias Next.js indexadas en Shodan son explotables directamente.

---

### 3.2. CVE-2026-44574 — Middleware Bypass via Dynamic Route Parameter Injection (ALTA)

| Campo | Valor |
|-------|-------|
| **GHSA** | GHSA-492v-c6pp-mqqv |
| **CVSS** | 8.1 / 10 (High) |
| **Vector** | AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N |
| **CWE** | CWE-288 (Authentication Bypass) |
| **Versiones afectadas** | >= 16.0.0, < 16.2.5 |
| **Versión corregida** | 16.2.5 |

**Descripción:**

Query parameters crafteados pueden alterar el valor de una ruta dinámica vista por la página mientras dejan el path visible sin cambios, permitiendo renderizar contenido protegido sin pasar el check de middleware.

**Impacto para Mas Cerca AP:** **RIESGO BAJO** — el proyecto no tiene `middleware.ts`. Sin embargo, si se agrega middleware de autenticación en el futuro sin actualizar Next.js, esta vulnerabilidad se vuelve explotable.

---

### 3.3. CVE-2026-44575 — Middleware Bypass via Segment-Prefetch Routes (ALTA)

| Campo | Valor |
|-------|-------|
| **GHSA** | GHSA-267c-6grr-h53f |
| **CVSS** | 7.5 / 10 (High) |
| **Vector** | AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N |
| **CWE** | CWE-288 (Authentication Bypass) |
| **Versiones afectadas** | >= 16.0.0, < 16.2.5 |
| **Versión corregida** | 16.2.5 |

**Descripción:**

URLs `.rsc` y segment-prefetch (`.../segments/.../....segment.rsc`) resuelven a la misma página sin ser matched por las reglas de middleware, permitiendo acceso no autorizado a contenido protegido.

**Función vulnerable:** `getMiddlewareMatchers()` en `packages/next/src/build/analysis/get-page-static-info.ts`

**Impacto para Mas Cerca AP:** **RIESGO BAJO** — no hay middleware configurado. Mismo riesgo futuro que CVE-2026-44574.

---

### 3.4. GHSA-8h8q-6873-q5fj — DoS via Server Components (ALTA)

| Campo | Valor |
|-------|-------|
| **CVE** | CVE-2026-23870 (React upstream) |
| **CVSS** | 7.5 / 10 (High) |
| **Vector** | AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H |
| **CWE** | CWE-770 (Allocation of Resources Without Limits) |
| **Versiones afectadas** | >= 16.0.0, < 16.2.5 |
| **Versión corregida** | 16.2.5 |

**Descripción:**

Un request HTTP especialmente crafteado a cualquier endpoint del App Router causa un loop infinito durante la deserialización de React Server Components, colgando el server process e impidiendo que se sirvan requests posteriores.

**Impacto para Mas Cerca AP:** **ALTO** — el proyecto usa App Router con Server Components. El ataque no requiere autenticación. Un solo request puede dejar el servidor inutilizable hasta que se reinicie el process.

---

### 3.5. GHSA-mg66-mrh9-m8jx — DoS via Connection Exhaustion en Cache Components (ALTA)

| Campo | Valor |
|-------|-------|
| **CVE** | CVE-2026-44579 |
| **CVSS** | 7.5 / 10 (High) |
| **Vector** | AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H |
| **CWE** | CWE-770 (Allocation of Resources Without Limits) |
| **Versiones afectadas** | >= 16.0.0, < 16.2.6 |
| **Versión corregida** | 16.2.6 |

**Descripción:**

Requests POST crafteados a server actions en aplicaciones que usan Cache Components (Partial Prerendering) triggeran un deadlock en el manejo del request body que consume file descriptors y capacidad del servidor hasta negar servicio a usuarios legítimos.

**Impacto para Mas Cerca AP:** **VERIFICAR** — depende de si el proyecto usa Cache Components. Si no las usa, el riesgo es bajo. Si las usa, el riesgo es alto.

---

### 3.6. GHSA-492v-c6pp-mqqv — Middleware Bypass (incomplete fix follow-up) (ALTA)

| Campo | Valor |
|-------|-------|
| **CVE** | CVE-2026-45109 |
| **CVSS** | 7.5 / 10 (High) |
| **Versiones afectadas** | >= 16.0.0, < 16.2.6 |
| **Versión corregida** | 16.2.6 |

**Descripción:**

Fix incompleto de CVE-2026-44575. Las rutas segment-prefetch siguen pudiendo bypassar middleware con variantes adicionales de URL.

**Impacto para Mas Cerca AP:** **RIESGO BAJO** — sin middleware, no hay bypass posible.

---

### 3.7. GHSA-gx5p-jg67-6x7h — XSS en beforeInteractive Scripts (MODERADA)

| Campo | Valor |
|-------|-------|
| **CVSS** | 6.1 / 10 (Moderate) |
| **Vector** | AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N |
| **CWE** | CWE-79 (Cross-site Scripting) |
| **Versiones afectadas** | >= 16.0.0, < 16.2.5 |
| **Versión corregida** | 16.2.5 |

**Descripción:**

Scripts `beforeInteractive` con input no confiable pueden ser inyectados con XSS.

**Impacto para Mas Cerca AP:** **RIESGO BAJO** — el CSP del proyecto es estático, no usa nonces dinámicos, y no hay evidencia de input de usuario inyectado en beforeInteractive scripts.

---

### 3.8. GHSA-h64f-5h5j-jqjh — DoS en Image Optimization API (MODERADA)

| Campo | Valor |
|-------|-------|
| **CVSS** | 5.9 / 10 (Moderate) |
| **Vector** | AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:N/A:H |
| **CWE** | CWE-770 (Allocation of Resources Without Limits) |
| **Versiones afectadas** | >= 16.0.0, < 16.2.5 |
| **Versión corregida** | 16.2.5 |

**Descripción:**

El endpoint `/_next/image` puede ser abusado para consumir recursos del servidor mediante requests especialmente diseñados.

**Impacto para Mas Cerca AP:** **MODERADO** — el proyecto tiene Image Optimization habilitada con 3 remote patterns configurados (`images.unsplash.com`, `api.qrserver.com`, `*.supabase.co`). Un atacante podría enviar requests al endpoint de optimización para agotar recursos.

---

### 3.9. GHSA-ffhc-5mcf-pf4q — XSS via CSP Nonces (MODERADA)

| Campo | Valor |
|-------|-------|
| **CVSS** | 4.7 / 10 (Moderate) |
| **Versiones afectadas** | >= 16.0.0, < 16.2.5 |
| **Versión corregida** | 16.2.5 |

**Impacto para Mas Cerca AP:** **NO APLICA** — el proyecto no usa CSP nonces dinámicos.

---

### 3.10. GHSA-vfv6-92ff-j949 — Cache Poisoning via RSC Cache-Busting (BAJA)

| Campo | Valor |
|-------|-------|
| **CVSS** | 3.7 / 10 (Low) |
| **Versiones afectadas** | >= 16.0.0, < 16.2.5 |
| **Versión corregida** | 16.2.5 |

**Impacto para Mas Cerca AP:** **BAJO** — requiere alta complejidad de ataque y colisiones específicas.

---

### 3.11. GHSA-3g8h-86w9-wvmq — Cache Poisoning via Middleware Redirects (BAJA)

| Campo | Valor |
|-------|-------|
| **CVSS** | 3.7 / 10 (Low) |
| **Versiones afectadas** | >= 16.0.0, < 16.2.5 |
| **Versión corregida** | 16.2.5 |

**Impacto para Mas Cerca AP:** **NO APLICA** — sin middleware de redirects.

---

### 3.12. GHSA-wfc6-r584-vfw7 — Cache Poisoning en RSC Responses (MODERADA)

| Campo | Valor |
|-------|-------|
| **CVSS** | 5.4 / 10 (Moderate) |
| **Versiones afectadas** | >= 16.0.0, < 16.2.5 |
| **Versión corregida** | 16.2.5 |

**Impacto para Mas Cerca AP:** **BAJO-MODERADO** — requiere condiciones específicas de cache.

---

### 3.13. GHSA-36qx-fr4f-26g5 — Pages Router i18n Bypass (ALTA)

| Campo | Valor |
|-------|-------|
| **CVSS** | 7.5 / 10 (High) |
| **Versiones afectadas** | >= 16.0.0, < 16.2.5 |
| **Versión corregida** | 16.2.5 |

**Impacto para Mas Cerca AP:** **NO APLICA** — el proyecto usa App Router, no Pages Router con i18n.

---

### 3.14. postcss < 8.5.10 — XSS via CSS Stringify (MODERADA)

| Campo | Valor |
|-------|-------|
| **GHSA** | GHSA-qx2v-qp2m-jg93 |
| **CVSS** | Moderada |
| **CWE** | CWE-79 (XSS) |
| **Ubicación** | `node_modules/next/node_modules/postcss` (transitiva) |

**Descripción:**

PostCSS no escapa correctamente `</style>` en su output CSS Stringify, permitiendo XSS si el output se inyecta en HTML.

**Impacto para Mas Cerca AP:** **BAJO** — es una dependencia transitiva de Next.js usada en build-time, no en runtime. El XSS solo sería explotable si el output de PostCSS se sirve directamente al browser sin sanitización adicional. Se resuelve automáticamente al actualizar Next.js a 16.2.6.

---

## 4. Vulnerabilidades npm Supply Chain — Contexto General

### 4.1. Panorama de ataques 2025-2026

El ecosistema npm ha sufrido múltiples ataques supply chain de gran escala:

| Incidente | Fecha | Paquetes comprometidos | Downloads/semana | Vector |
|-----------|-------|----------------------|------------------|--------|
| **S1ngularity (Nx)** | Ago 2025 | Varios paquetes Nx | Miles | GitHub Actions token robado |
| **Chalk/Debug Campaign** | Sep 2025 | 18+ paquetes (chalk, debug, ansi-styles, etc.) | 2.6 billones | Phishing a maintainer |
| **180+ Packages Worm** | Sep 2025 | 180+ paquetes | Miles de millones | Worm auto-replicante |
| **CanisterSprawl** | Abr 2026 | @automagik/genie, pgserve, etc. | Miles | Worm con exfiltración via ICP canister |
| **TeamPCP / Mini Shai-Hulud** | May 2026 | @tanstack/react-router, UiPath, DraftLab | Millones | Worm con SLSA Build L3 válido |
| **Axios Hijack** | Mar 2026 | axios (100M+ downloads/semana) | 100M+ | Hidden dependency con RAT |

### 4.2. Estado de las dependencias de Mas Cerca AP

**Dependencias directas verificadas:**

| Paquete | ¿Comprometido en ataques conocidos? | Estado |
|---------|-------------------------------------|--------|
| `@hookform/resolvers` | No | OK |
| `@next/third-parties` | No | OK |
| `@supabase/supabase-js` | No | OK |
| `framer-motion` | No | OK |
| `next` | No comprometido, pero vulnerable (CVEs) | **VULNERABLE** |
| `react` | No comprometido, pero tuvo CVEs (parcheados) | OK (19.2.4) |
| `react-dom` | No comprometido | OK |
| `react-hook-form` | No | OK |
| `resend` | No | OK |
| `server-only` | No | OK |
| `zod` | No | OK |

**Conclusión:** Ninguna dependencia directa de Mas Cerca AP fue comprometida en los ataques supply chain conocidos. El riesgo principal sigue siendo las vulnerabilidades conocidas (CVEs) de Next.js, no la supply chain.

### 4.3. Riesgo futuro

El patrón de ataques supply chain en npm muestra una **escalación constante** en sofisticación:

1. **Phishing a maintainers** -> robo de cuentas
2. **Robo de CI/CD tokens** -> publicación automática de paquetes maliciosos
3. **Worms auto-replicantes** -> infección de paquetes downstream
4. **Attestaciones SLSA válidas** -> los paquetes maliciosos parecen legítimos
5. **Hidden dependencies** -> malware inyectado como dependencia oculta

**Recomendaciones preventivas:**

- Usar `npm audit` como parte del CI/CD
- Considerar lockfile auditing con herramientas como Socket.dev o Snyk
- Pinning de versiones exactas en `package.json` (no rangos con `^` o `~` para paquetes críticos)
- Monitorear el [GitHub Advisory Database](https://github.com/advisories?query=ecosystem%3Anpm) para alertas tempranas

---

## 5. Matriz de Impacto para Mas Cerca AP

| Vulnerabilidad | Severidad | ¿Afecta? | Riesgo Real | Requiere Acción |
|---------------|-----------|----------|-------------|-----------------|
| CVE-2026-44578 (SSRF) | 8.6 CRÍTICA | **SÍ** (si self-hosted) | **ALTO** | **URGENTE** |
| GHSA-8h8q-6873-q5fj (DoS RSC) | 7.5 ALTA | **SÍ** | **ALTO** | **URGENTE** |
| GHSA-mg66-mrh9-m8jx (DoS Cache) | 7.5 ALTA | Verificar | MODERADO | **URGENTE** |
| CVE-2026-44574 (Middleware bypass) | 8.1 ALTA | No (sin middleware) | BAJO | Preventivo |
| CVE-2026-44575 (Segment-prefetch) | 7.5 ALTA | No (sin middleware) | BAJO | Preventivo |
| CVE-2026-45109 (Middleware bypass v2) | 7.5 ALTA | No (sin middleware) | BAJO | Preventivo |
| GHSA-gx5p-jg67-6x7h (XSS beforeInteractive) | 6.1 MODERADA | Probablemente no | BAJO | Preventivo |
| GHSA-h64f-5h5j-jqjh (DoS Image Opt) | 5.9 MODERADA | **SÍ** | MODERADO | **URGENTE** |
| GHSA-ffhc-5mcf-pf4q (XSS CSP nonces) | 4.7 MODERADA | No | NULO | No |
| GHSA-wfc6-r584-vfw7 (Cache poisoning RSC) | 5.4 MODERADA | Posible | BAJO | Preventivo |
| GHSA-3g8h-86w9-wvmq (Cache poisoning redirects) | 3.7 BAJA | No | NULO | No |
| GHSA-vfv6-92ff-j949 (Cache poisoning RSC busting) | 3.7 BAJA | Posible | BAJO | Preventivo |
| GHSA-36qx-fr4f-26g5 (Pages Router i18n) | 7.5 ALTA | No (App Router) | NULO | No |
| postcss XSS (transitiva) | MODERADA | Build-time | BAJO | **URGENTE** |

---

## 6. Recomendación de Acción

### 6.1. Inmediata (hoy)

Actualizar Next.js a la versión parcheada:

```bash
npm install next@16.2.6 eslint-config-next@16.2.6
```

Esto resuelve **las 13 vulnerabilidades** de Next.js y la vulnerabilidad transitiva de postcss en un solo paso.

### 6.2. Post-upgrade

1. **Correr tests:** `npm test` para verificar que no hay regresiones
2. **Verificar build:** `npm run build` para confirmar compilación exitosa
3. **Re-verificar:** `npm audit` para confirmar 0 vulnerabilidades
4. **Deploy:** Si self-hosted, redeployar inmediatamente

### 6.3. Preventivo a futuro

1. **Automatizar auditorías:** Agregar `npm audit` al pipeline de CI/CD
2. **Dependabot o Renovate:** Configurar actualizaciones automáticas de seguridad
3. **Monitoreo:** Suscribirse a [GitHub Security Advisories para Next.js](https://github.com/vercel/next.js/security/advisories)
4. **Lockfile commit:** Siempre commitear `package-lock.json` para reproducibilidad
5. **Evaluar hosting:** Si self-hosted, considerar migrar a Vercel para eliminar la superficie de ataque SSRF

---

## 7. URLs Consultadas

### Vulnerabilidades Next.js

| Fuente | URL |
|--------|-----|
| GitHub Advisory (SSRF) | https://github.com/advisories/GHSA-c4j6-fc7j-m34r |
| GitHub Advisory (Middleware bypass) | https://github.com/advisories/GHSA-492v-c6pp-mqqv |
| GitHub Advisory (Segment-prefetch bypass) | https://github.com/advisories/GHSA-267c-6grr-h53f |
| GitHub Advisory (DoS Server Components) | https://github.com/advisories/GHSA-8h8q-6873-q5fj |
| GitHub Advisory (DoS Cache Components) | https://github.com/advisories/GHSA-mg66-mrh9-m8jx |
| GitHub Advisory (XSS beforeInteractive) | https://github.com/advisories/GHSA-gx5p-jg67-6x7h |
| GitHub Advisory (DoS Image Optimization) | https://github.com/advisories/GHSA-h64f-5h5j-jqjh |
| GitHub Advisory (XSS CSP nonces) | https://github.com/advisories/GHSA-ffhc-5mcf-pf4q |
| GitHub Advisory (Cache poisoning RSC) | https://github.com/advisories/GHSA-wfc6-r584-vfw7 |
| GitHub Advisory (Cache poisoning redirects) | https://github.com/advisories/GHSA-3g8h-86w9-wvmq |
| GitHub Advisory (Cache poisoning RSC busting) | https://github.com/advisories/GHSA-vfv6-92ff-j949 |
| GitHub Advisory (Pages Router i18n) | https://github.com/advisories/GHSA-36qx-fr4f-26g5 |
| GitHub Advisory (Middleware bypass incomplete fix) | https://github.com/advisories/GHSA-26hh-7cqf-hhc6 |
| Next.js Security Update Dec 2025 | https://nextjs.org/blog/security-update-2025-12-11 |
| CVE-2026-44578 (Hadrian) | https://hadrian.io/blog/next-js-websocket-ssrf-unauthenticated-access-to-internal-resources-cve-2026-44578-2 |
| CVE-2026-44575 (Miggo) | https://www.miggo.io/vulnerability-database/cve/CVE-2026-44575 |
| CVE-2026-44574 (Miggo) | https://www.miggo.io/vulnerability-database/cve/CVE-2026-44574 |
| CVE-2026-44578 (Miggo) | https://www.miggo.io/vulnerability-database/cve/CVE-2026-44578 |
| CybersecurityNews (SSRF) | https://cybersecuritynews.com/next-js-vulnerability-exposes-credentials/ |
| CybersecurityNews (Credentials) | https://cyberpress.org/vulnerabilities-patched-in-next-js-and-react/ |
| CyberPress (Next.js Flaw) | https://cyberpress.org/next-js-flaw-api-keys-admin-panels/ |
| CyberSecurityTimes | https://cybersecuritytimes.com/critical-flaw-patched-next-js-react-server/ |
| Haposoftware (13 CVEs) | https://haposoft.com/en/blog/tech-insight/nextjs-may-2026-security-patch |
| Eventus Security Advisory | https://advisory.eventussecurity.com/advisory/next-js-vulnerabilities-impact-identity-verification-and-request-routing |
| Cloudflare WAF Mitigations | https://developers.cloudflare.com/changelog/post/2026-05-06-react-nextjs-vulnerabilities/ |
| GitLab Advisory (CVE-2026-44574) | http://advisories.gitlab.com/npm/next/CVE-2026-44574 |
| GitLab Advisory (CVE-2026-44575) | https://advisories.gitlab.com/npm/next/CVE-2026-44575 |
| OpenCVE (Next.js CVEs) | https://app.opencve.io/cve/?product=next.js&vendor=vercel |
| Vercel Security Changelog May 2026 | https://vercel.com/changelog/next-js-may-2026-security-release |
| BSI IT-Sicherheitswarnung | http://news.de/technik/859595875/vercel-next-js-gefaehrdet-it-sicherheitswarnung-vom-bsi-und-bug-report-bekannte-schwachstellen-und-sicherheitsluecken/1 |

### npm Supply Chain Attacks

| Fuente | URL |
|--------|-----|
| StepSecurity (Mini Shai-Hulud / TanStack) | https://www.stepsecurity.io/blog/mini-shai-hulud-is-back-a-self-spreading-supply-chain-attack-hits-the-npm-ecosystem |
| The Hacker News (180+ packages) | https://thehackernews.com/2025/09/40-npm-packages-compromised-in-supply.html |
| SISA (Crypto-stealer) | https://www.sisainfosec.com/blogs/browser-based-crypto-stealer-in-npm-supply-chain-attack-report-by-sisa-sappers |
| CyberDesserts (npm risks 2026) | https://blog.cyberdesserts.com/npm-security-vulnerabilities |
| Sonatype (Supply chain attack) | https://www.sonatype.com/blog/ongoing-npm-software-supply-chain-attack-exposes-new-risks |
| ArmorCode (Playbook 2026) | https://www.armorcode.com/blog/the-npm-supply-chain-attack-playbook-that-still-works-in-2026 |
| ArmorCode (Sep 2025 attack) | https://www.armorcode.com/blog/inside-the-september-2025-npm-supply-chain-attack |
| DEV Community (Deep dive) | https://dev.to/om_shree_0709/the-largest-npm-supply-chain-attack-of-2025-a-deep-dive-into-the-compromise-of-billions-of-3f45 |
| Qualys (Response guide) | https://blog.qualys.com/vulnerabilities-threat-research/2025/09/10/when-dependencies-turn-dangerous-responding-to-the-npm-supply-chain-attack |
| The Hacker News (CanisterSprawl) | http://thehackernews.com/2026/04/self-propagating-supply-chain-worm.html |

---

## 8. Conclusión

El proyecto Mas Cerca AP está **activamente expuesto** a 13 vulnerabilidades conocidas de Next.js, de las cuales al menos **3 son explotables en la configuración actual del proyecto** (SSRF, DoS via Server Components, DoS via Image Optimization).

La actualización a **Next.js 16.2.6** es un cambio de patch version que resuelve todas las vulnerabilidades identificadas. El riesgo de breaking changes es mínimo. **No hay justificación técnica para postergar esta actualización.**

En cuanto a supply chain, las dependencias directas del proyecto no fueron comprometidas en los ataques conocidos, pero el ecosistema npm sigue siendo un blanco activo y en escalación. Se recomienda implementar controles preventivos de seguridad de dependencias como parte de la maduración del proyecto.
