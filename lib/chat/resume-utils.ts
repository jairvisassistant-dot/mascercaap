/**
 * Pure lifecycle mapping for the `/[lang]/chat` resume redemption shell.
 *
 * Kept out of `ChatResumeClient.tsx` so that module only exports components and
 * Fast Refresh can preserve the shell state.
 */

export type ResumeStatus = "idle" | "pending" | "ok" | "error";
export type ResumePanelState = { kind: "pending" } | { kind: "ok" } | { kind: "error" };

/** Maps the redeem lifecycle to a panel state without leaking a failure reason. */
export function resolveResumePanelState(input: {
  token: string;
  status: ResumeStatus;
}): ResumePanelState {
  if (input.token.trim() === "") return { kind: "error" };
  if (input.status === "ok") return { kind: "ok" };
  if (input.status === "error") return { kind: "error" };
  return { kind: "pending" };
}
