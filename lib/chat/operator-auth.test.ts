import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const requireAdminAuthMock = vi.fn();

vi.mock("@/lib/admin/auth", () => ({
  requireAdminAuth: (...args: unknown[]) => requireAdminAuthMock(...args),
}));

import { NextResponse } from "next/server";

import {
  OPERATOR_SENDER_TYPE,
  buildOperatorMessageCommand,
  getOperatorIdentity,
  requireOperatorAuth,
  resolveOperatorIdentityFromEnv,
  type OperatorIdentity,
} from "./operator-auth";
import { operatorCloseSchema, operatorReplySchema } from "./validation";
import { CHAT_GENERIC_ERROR_CODE } from "./types";

const EMAIL = "coordinator@example.com";

function identity(): OperatorIdentity {
  return { operatorId: EMAIL, senderType: OPERATOR_SENDER_TYPE };
}

describe("resolveOperatorIdentityFromEnv", () => {
  it("derives the operator identity from the server environment only", () => {
    expect(resolveOperatorIdentityFromEnv({ ADMIN_EMAIL: EMAIL })).toEqual({
      operatorId: EMAIL,
      senderType: "operator",
    });
  });

  it("trims surrounding whitespace", () => {
    expect(
      resolveOperatorIdentityFromEnv({ ADMIN_EMAIL: `  ${EMAIL}  ` })?.operatorId
    ).toBe(EMAIL);
  });

  it("returns null for a missing or blank admin email", () => {
    expect(resolveOperatorIdentityFromEnv({})).toBeNull();
    expect(resolveOperatorIdentityFromEnv({ ADMIN_EMAIL: "   " })).toBeNull();
  });

  it("never derives the identity from request-supplied values", () => {
    const identity = resolveOperatorIdentityFromEnv({
      ADMIN_EMAIL: EMAIL,
      // A hostile environment/process map must not be able to override the role.
      operatorId: "attacker",
      senderType: "operator",
    });

    expect(identity?.operatorId).toBe(EMAIL);
  });
});

describe("getOperatorIdentity", () => {
  it("reads the identity from process.env.ADMIN_EMAIL", () => {
    const previous = process.env.ADMIN_EMAIL;
    process.env.ADMIN_EMAIL = EMAIL;
    try {
      expect(getOperatorIdentity()).toEqual({
        operatorId: EMAIL,
        senderType: "operator",
      });
    } finally {
      process.env.ADMIN_EMAIL = previous;
    }
  });
});

describe("requireOperatorAuth", () => {
  it("returns null when the admin boundary authorizes the request", async () => {
    requireAdminAuthMock.mockResolvedValueOnce(null);

    await expect(
      requireOperatorAuth(new Request("https://mascercaap.com/operator/inbox"))
    ).resolves.toBeNull();
    expect(requireAdminAuthMock).toHaveBeenCalledTimes(1);
  });

  it("returns a generic error response (preserving the status) on rejection", async () => {
    requireAdminAuthMock.mockResolvedValueOnce(
      NextResponse.json({ error: "Sesión inválida o expirada" }, { status: 401 })
    );

    const response = await requireOperatorAuth(
      new Request("https://mascercaap.com/operator/inbox")
    );

    expect(response).not.toBeNull();
    expect(response?.status).toBe(401);
    const body = await response!.json();
    expect(body).toEqual({ success: false, error: CHAT_GENERIC_ERROR_CODE });
    // The original identity-bearing message must not leak.
    expect(JSON.stringify(body)).not.toContain("Sesión inválida");
  });
});

describe("operator reply/close schemas — spoofing rejection", () => {
  it("accepts a bounded operator reply", () => {
    expect(
      operatorReplySchema.safeParse({
        body: "Hola, en qué te ayudo?",
        clientMessageId: "reply-123456",
      }).success
    ).toBe(true);
  });

  it("rejects a client-supplied sender_type on a reply", () => {
    expect(
      operatorReplySchema.safeParse({
        body: "hi",
        clientMessageId: "reply-123456",
        sender_type: "operator",
      }).success
    ).toBe(false);
  });

  it("rejects client-supplied role/identity fields on a reply", () => {
    for (const key of ["role", "operatorId", "sender", "senderName"]) {
      expect(
        operatorReplySchema.safeParse({
          body: "hi",
          clientMessageId: "reply-123456",
          [key]: "attacker",
        }).success
      ).toBe(false);
    }
  });

  it("accepts a valid close with a required classification", () => {
    const parsed = operatorCloseSchema.parse({
      closeResult: "resuelto",
    });

    expect(parsed.purge).toBe(false);
    expect(parsed.closeNote).toBeUndefined();
  });

  it("rejects an unknown close classification", () => {
    expect(
      operatorCloseSchema.safeParse({ closeResult: "algo" }).success
    ).toBe(false);
  });

  it("rejects an unknown field on close", () => {
    expect(
      operatorCloseSchema.safeParse({
        closeResult: "resuelto",
        operatorId: "attacker",
      }).success
    ).toBe(false);
  });
});

describe("buildOperatorMessageCommand", () => {
  it("uses the server-derived identity and sender type", () => {
    const command = buildOperatorMessageCommand(
      "conv-1",
      { body: "hello", clientMessageId: "reply-123456" },
      identity()
    );

    expect(command).toEqual({
      conversationId: "conv-1",
      senderType: "operator",
      senderName: EMAIL,
      body: "hello",
      clientMessageId: "reply-123456",
    });
  });

  it("ignores any identity smuggled onto the validated reply object", () => {
    const reply = {
      body: "hello",
      clientMessageId: "reply-123456",
      senderType: "bot",
      senderName: "attacker",
    } as unknown as { body: string; clientMessageId: string };

    const command = buildOperatorMessageCommand("conv-1", reply, identity());

    expect(command.senderType).toBe("operator");
    expect(command.senderName).toBe(EMAIL);
  });
});
