import { describe, expect, it, vi } from "vitest";

// server-only throws when imported outside a Next.js Server Component context
// (Vitest runs in a plain node environment). Mock it before importing the module.
vi.mock("server-only", () => ({}));

import {
  CHAT_FEATURE_FLAGS,
  chatConfig,
  createChatConfig,
  type ChatConfig,
} from "./config";

const DEPENDENT_KEYS = [
  "push",
  "email",
  "bot",
  "retention",
  "marketing",
] as const;

describe("CHAT_FEATURE_FLAGS", () => {
  it("declares the six required chat flags", () => {
    expect([...CHAT_FEATURE_FLAGS]).toEqual([
      "CHAT_ENABLED",
      "CHAT_PUSH_ENABLED",
      "CHAT_EMAIL_ENABLED",
      "CHAT_BOT_ENABLED",
      "CHAT_RETENTION_ENABLED",
      "CHAT_MARKETING_ENABLED",
    ]);
  });
});

describe("createChatConfig — defaults", () => {
  it("disables every flag when the environment is empty", () => {
    const config = createChatConfig({});

    expect(config.enabled).toBe(false);
    for (const key of DEPENDENT_KEYS) {
      expect(config[key]).toBe(false);
    }
  });

  it("disables every flag when values are undefined", () => {
    const env = Object.fromEntries(
      CHAT_FEATURE_FLAGS.map((flag) => [flag, undefined])
    );
    const config = createChatConfig(env);

    expect(config.enabled).toBe(false);
    for (const key of DEPENDENT_KEYS) {
      expect(config[key]).toBe(false);
    }
  });
});

describe("createChatConfig — master flag parsing", () => {
  it.each([
    "true",
  ])('enables the master flag only for the literal "true" (%s)', (value) => {
    expect(createChatConfig({ CHAT_ENABLED: value }).enabled).toBe(true);
  });

  it.each([
    "false",
    "TRUE",
    "True",
    "1",
    "yes",
    "on",
    "",
    " true",
    "true ",
    "truthy",
  ])('rejects non-literal values for the master flag (%j)', (value) => {
    expect(createChatConfig({ CHAT_ENABLED: value }).enabled).toBe(false);
  });
});

describe("createChatConfig — dependent flags require the master flag", () => {
  it("enables every dependent flag when both master and dependent are literal true", () => {
    const config = createChatConfig({
      CHAT_ENABLED: "true",
      CHAT_PUSH_ENABLED: "true",
      CHAT_EMAIL_ENABLED: "true",
      CHAT_BOT_ENABLED: "true",
      CHAT_RETENTION_ENABLED: "true",
      CHAT_MARKETING_ENABLED: "true",
    });

    expect(config.enabled).toBe(true);
    for (const key of DEPENDENT_KEYS) {
      expect(config[key]).toBe(true);
    }
  });

  it("keeps all dependent flags off when the master flag is off", () => {
    const config = createChatConfig({
      CHAT_ENABLED: "false",
      CHAT_PUSH_ENABLED: "true",
      CHAT_EMAIL_ENABLED: "true",
      CHAT_BOT_ENABLED: "true",
      CHAT_RETENTION_ENABLED: "true",
      CHAT_MARKETING_ENABLED: "true",
    });

    expect(config.enabled).toBe(false);
    for (const key of DEPENDENT_KEYS) {
      expect(config[key]).toBe(false);
    }
  });

  it("keeps dependent flags off when the master flag is invalid", () => {
    const config = createChatConfig({
      CHAT_ENABLED: "TRUE",
      CHAT_PUSH_ENABLED: "true",
    });

    expect(config.enabled).toBe(false);
    expect(config.push).toBe(false);
  });

  it("rejects non-literal dependent values even when the master flag is on", () => {
    const config = createChatConfig({
      CHAT_ENABLED: "true",
      CHAT_PUSH_ENABLED: "yes",
      CHAT_EMAIL_ENABLED: "1",
      CHAT_BOT_ENABLED: "",
    });

    expect(config.enabled).toBe(true);
    expect(config.push).toBe(false);
    expect(config.email).toBe(false);
    expect(config.bot).toBe(false);
  });
});

describe("ChatEnv — NodeJS.ProcessEnv compatibility", () => {
  it("accepts a NodeJS.ProcessEnv-shaped map and ignores unrelated keys", () => {
    const env: NodeJS.ProcessEnv = {
      NODE_ENV: "development",
      CHAT_ENABLED: "true",
      UNRELATED_VARIABLE: "ignored",
    };

    expect(createChatConfig(env).enabled).toBe(true);
  });
});

describe("chatConfig — process-env backed configuration", () => {
  it("exposes the full six-flag shape with boolean values", () => {
    const config: ChatConfig = chatConfig;

    expect(typeof config.enabled).toBe("boolean");
    for (const key of DEPENDENT_KEYS) {
      expect(typeof config[key]).toBe("boolean");
    }
  });

  it("does not enable dependent flags while the master flag is off", () => {
    if (!chatConfig.enabled) {
      for (const key of DEPENDENT_KEYS) {
        expect(chatConfig[key]).toBe(false);
      }
    }
  });
});
