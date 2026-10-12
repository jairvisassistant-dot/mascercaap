import "server-only";

/**
 * Server-only chat feature flags.
 *
 * These variables intentionally do NOT use the `NEXT_PUBLIC_` prefix so Next.js
 * never inlines them into the browser bundle. Importing this module from a
 * Client Component fails the build because of the `server-only` guard.
 *
 * Only the exact literal string `"true"` enables a flag. Every other value —
 * including `"TRUE"`, `"1"`, `"yes"`, or an empty string — resolves to `false`.
 * Dependent capabilities remain disabled while `CHAT_ENABLED` is off.
 */

export const CHAT_FEATURE_FLAGS = [
  "CHAT_ENABLED",
  "CHAT_PUSH_ENABLED",
  "CHAT_EMAIL_ENABLED",
  "CHAT_BOT_ENABLED",
  "CHAT_RETENTION_ENABLED",
  "CHAT_MARKETING_ENABLED",
] as const;

export type ChatFeatureFlag = (typeof CHAT_FEATURE_FLAGS)[number];

export type ChatConfig = {
  /** Master switch. When false, every dependent capability stays disabled. */
  readonly enabled: boolean;
  readonly push: boolean;
  readonly email: boolean;
  readonly bot: boolean;
  readonly retention: boolean;
  readonly marketing: boolean;
};

/**
 * Environment map accepted by {@link createChatConfig}.
 *
 * The string index signature mirrors `NodeJS.ProcessEnv` (`Dict<string>`) so the
 * real `process.env` is assignable without a cast. The six documented
 * `ChatFeatureFlag` keys remain explicit for autocomplete and typo detection in
 * tests, but only those six keys are ever read — every other entry is ignored.
 * This is a type-only widening: runtime parsing stays literal-`"true"`-only and
 * no value is exposed to the client.
 */
export type ChatEnv = Partial<Record<ChatFeatureFlag, string | undefined>> & {
  readonly [key: string]: string | undefined;
};

function isLiteralTrue(value: string | undefined): boolean {
  return value === "true";
}

/**
 * Builds a chat configuration from a given environment map. Pure and
 * side-effect free so it can be exercised directly in tests.
 */
export function createChatConfig(env: ChatEnv): ChatConfig {
  const enabled = isLiteralTrue(env.CHAT_ENABLED);
  const dependent = (flag: ChatFeatureFlag): boolean =>
    enabled && isLiteralTrue(env[flag]);

  return Object.freeze({
    enabled,
    push: dependent("CHAT_PUSH_ENABLED"),
    email: dependent("CHAT_EMAIL_ENABLED"),
    bot: dependent("CHAT_BOT_ENABLED"),
    retention: dependent("CHAT_RETENTION_ENABLED"),
    marketing: dependent("CHAT_MARKETING_ENABLED"),
  });
}

/** Process-environment backed configuration for server-side consumers. */
export const chatConfig: ChatConfig = createChatConfig(process.env);
