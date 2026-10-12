import { describe, expect, it, vi } from "vitest";

// server-only throws when imported outside a Next.js Server Component context
// (Vitest runs in a plain node environment). Mock it before importing the module.
vi.mock("server-only", () => ({}));

import {
  CHAT_DB_DEFAULT_CONNECT_TIMEOUT_MS,
  CHAT_DB_DEFAULT_POOL_SIZE,
  CHAT_DB_DEFAULT_PORT,
  CHAT_DB_DEFAULT_QUERY_TIMEOUT_MS,
  CHAT_DB_HOST,
  CHAT_DB_MAX_POOL_SIZE,
  CHAT_DB_MIN_POOL_SIZE,
  ChatDatabaseConfigError,
  createChatDatabaseConfig,
} from "./database-config";

const REQUIRED = {
  CHAT_DB_NAME: "chat",
  CHAT_DB_USER: "chat_user",
  CHAT_DB_PASSWORD: "chat_password",
} as const;

describe("createChatDatabaseConfig — required credentials", () => {
  it("builds a config when name, user and password are present", () => {
    const config = createChatDatabaseConfig({ ...REQUIRED });

    expect(config.database).toBe("chat");
    expect(config.user).toBe("chat_user");
    expect(config.password).toBe("chat_password");
  });

  it.each(["CHAT_DB_NAME", "CHAT_DB_USER", "CHAT_DB_PASSWORD"] as const)(
    "throws when %s is missing",
    (key) => {
      const env = { ...REQUIRED, [key]: undefined };

      expect(() => createChatDatabaseConfig(env)).toThrowError(
        ChatDatabaseConfigError
      );
    }
  );

  it.each(["CHAT_DB_NAME", "CHAT_DB_USER", "CHAT_DB_PASSWORD"] as const)(
    "throws when %s is empty or whitespace",
    (key) => {
      for (const value of ["", "   ", "\t"]) {
        const env = { ...REQUIRED, [key]: value };

        expect(() => createChatDatabaseConfig(env)).toThrowError(
          ChatDatabaseConfigError
        );
      }
    }
  );

  it("names the missing variable without echoing other secrets", () => {
    const secret = "should-not-appear-in-error";
    const env = {
      CHAT_DB_USER: "chat_user",
      CHAT_DB_PASSWORD: secret,
    };

    let message = "";
    try {
      createChatDatabaseConfig(env);
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain("CHAT_DB_NAME");
    expect(message).not.toContain(secret);
  });

  it("does not leak a provided password when the host is rejected", () => {
    const secret = "p@ssw0rd-should-not-leak";
    const env = {
      ...REQUIRED,
      CHAT_DB_PASSWORD: secret,
      CHAT_DB_HOST: "db.example.com",
    };

    let message = "";
    try {
      createChatDatabaseConfig(env);
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).not.toContain(secret);
  });
});

describe("createChatDatabaseConfig — host is fixed to IPv4 loopback", () => {
  it("defaults to 127.0.0.1 when the host is unset", () => {
    expect(createChatDatabaseConfig({ ...REQUIRED }).host).toBe(CHAT_DB_HOST);
  });

  it("accepts an explicit 127.0.0.1 host", () => {
    const config = createChatDatabaseConfig({
      ...REQUIRED,
      CHAT_DB_HOST: "127.0.0.1",
    });

    expect(config.host).toBe("127.0.0.1");
  });

  it.each(["localhost", "::1", "0.0.0.0", "db.example.com", "10.0.0.5"])(
    "rejects %s instead of silently falling back",
    (host) => {
      expect(() =>
        createChatDatabaseConfig({ ...REQUIRED, CHAT_DB_HOST: host })
      ).toThrowError(ChatDatabaseConfigError);
    }
  );
});

describe("createChatDatabaseConfig — bounded numeric parsing", () => {
  it("defaults the port to 3306 and honours an explicit valid port", () => {
    expect(createChatDatabaseConfig({ ...REQUIRED }).port).toBe(
      CHAT_DB_DEFAULT_PORT
    );
    expect(
      createChatDatabaseConfig({ ...REQUIRED, CHAT_DB_PORT: "3307" }).port
    ).toBe(3307);
  });

  it("falls back to the default port for invalid input", () => {
    for (const value of ["abc", "3.5", "0", "-1", "70000"]) {
      expect(
        createChatDatabaseConfig({ ...REQUIRED, CHAT_DB_PORT: value }).port
      ).toBe(CHAT_DB_DEFAULT_PORT);
    }
  });

  it("defaults the pool limit to 8 and honours values within 1..10", () => {
    expect(createChatDatabaseConfig({ ...REQUIRED }).poolLimit).toBe(
      CHAT_DB_DEFAULT_POOL_SIZE
    );
    for (const value of ["1", "5", "10"]) {
      expect(
        createChatDatabaseConfig({ ...REQUIRED, CHAT_DB_POOL_SIZE: value })
          .poolLimit
      ).toBe(Number(value));
    }
  });

  it("clamps an oversized pool limit to the Hostinger-safe maximum", () => {
    const config = createChatDatabaseConfig({
      ...REQUIRED,
      CHAT_DB_POOL_SIZE: "75",
    });

    expect(config.poolLimit).toBe(CHAT_DB_MAX_POOL_SIZE);
  });

  it("clamps a zero or negative pool limit to the minimum", () => {
    for (const value of ["0", "-3"]) {
      expect(
        createChatDatabaseConfig({ ...REQUIRED, CHAT_DB_POOL_SIZE: value })
          .poolLimit
      ).toBe(CHAT_DB_MIN_POOL_SIZE);
    }
  });

  it("falls back to the default pool limit for non-integer input", () => {
    for (const value of ["", "abc", "4.2"]) {
      expect(
        createChatDatabaseConfig({ ...REQUIRED, CHAT_DB_POOL_SIZE: value })
          .poolLimit
      ).toBe(CHAT_DB_DEFAULT_POOL_SIZE);
    }
  });

  it("defaults and clamps the connection and query timeouts", () => {
    const defaults = createChatDatabaseConfig({ ...REQUIRED });
    expect(defaults.connectTimeoutMs).toBe(CHAT_DB_DEFAULT_CONNECT_TIMEOUT_MS);
    expect(defaults.queryTimeoutMs).toBe(CHAT_DB_DEFAULT_QUERY_TIMEOUT_MS);

    const clamped = createChatDatabaseConfig({
      ...REQUIRED,
      CHAT_DB_CONNECT_TIMEOUT_MS: "999999999",
      CHAT_DB_QUERY_TIMEOUT_MS: "0",
    });
    expect(clamped.connectTimeoutMs).toBeLessThanOrEqual(120_000);
    expect(clamped.queryTimeoutMs).toBeGreaterThanOrEqual(1);
  });

  it("returns a frozen configuration object", () => {
    const config = createChatDatabaseConfig({ ...REQUIRED });

    expect(Object.isFrozen(config)).toBe(true);
  });
});
