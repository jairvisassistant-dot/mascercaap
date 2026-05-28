export type Factor = { id: string; friendly_name: string | null; created_at: string };

export type MfaStatus =
  | { status: "loading" }
  | { status: "disabled" }
  | { status: "enabled"; factors: Factor[] }
  | { status: "error"; message: string };

export type EnrollStep = "idle" | "qr";
