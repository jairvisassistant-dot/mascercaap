import { createRateLimiter } from "@/lib/rate-limit";

const adminWriteLimiter = createRateLimiter({
  id: "admin-write",
  max: 30,
  windowMs: 60_000,
});

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anonymous"
  );
}

export async function checkAdminWriteRateLimit(
  req: Request,
): Promise<Response | null> {
  const { allowed, retryAfter } = await adminWriteLimiter.check(getClientIp(req));
  if (!allowed) {
    return Response.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo en unos segundos." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }
  return null;
}
