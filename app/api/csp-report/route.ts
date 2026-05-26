import { NextRequest, NextResponse } from "next/server";

// CSP violation reports arrive as POST with Content-Type: application/csp-report
// No auth required — the browser sends these automatically.
// Violations are logged server-side; no data is stored.
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const report = JSON.parse(body) as { "csp-report"?: Record<string, unknown> };
    const violation = report["csp-report"];
    if (violation) {
      console.warn("[CSP violation]", JSON.stringify(violation));
    }
  } catch {
    // Malformed report — ignore silently
  }
  return new NextResponse(null, { status: 204 });
}
