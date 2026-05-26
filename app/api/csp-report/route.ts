import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

type CSPReportBody = Record<string, unknown>;

function asText(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function normalizeReports(payload: unknown): CSPReportBody[] {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const candidate = item as { body?: unknown; type?: unknown };
        if (candidate.type === "csp-violation" && candidate.body && typeof candidate.body === "object") {
          return candidate.body as CSPReportBody;
        }
        return null;
      })
      .filter((item): item is CSPReportBody => Boolean(item));
  }

  if (payload && typeof payload === "object") {
    const legacy = (payload as { "csp-report"?: unknown })["csp-report"];
    if (legacy && typeof legacy === "object") {
      return [legacy as CSPReportBody];
    }
  }

  return [];
}

// CSP violation reports arrive as POST with Content-Type: application/csp-report
// No auth required — the browser sends these automatically.
// Violations are logged and persisted for gradual hardening analysis.
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const parsed = JSON.parse(body) as unknown;
    const reports = normalizeReports(parsed);

    if (reports.length > 0) {
      console.warn("[CSP violation]", JSON.stringify(reports[0]));

      if (supabaseAdmin) {
        const payload = reports.map((report) => ({
          document_uri: asText(report["document-uri"]),
          violated_directive: asText(report["violated-directive"]),
          effective_directive: asText(report["effective-directive"]),
          original_policy: asText(report["original-policy"]),
          blocked_uri: asText(report["blocked-uri"]),
          source_file: asText(report["source-file"]),
          line_number: asNumber(report["line-number"]),
          column_number: asNumber(report["column-number"]),
          status_code: asNumber(report["status-code"]),
          disposition: asText(report["disposition"]),
          raw_report: report,
        }));

        const { error } = await supabaseAdmin.from("csp_violation_reports").insert(payload);
        if (error) {
          console.warn("[CSP violation persistence failed]", error.message);
        }
      }
    }
  } catch {
    // Malformed report — ignore silently
  }
  return new NextResponse(null, { status: 204 });
}
