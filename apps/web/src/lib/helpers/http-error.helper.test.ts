import { describe, expect, it } from "vitest";

import { getHttpErrorMessage, getHttpStatus } from "./http-error.helper";

describe("getHttpStatus", () => {
  it("reads status from axios-like errors", () => {
    expect(getHttpStatus({ response: { status: 404 } })).toBe(404);
  });

  it("returns undefined for unknown errors", () => {
    expect(getHttpStatus(new Error("boom"))).toBeUndefined();
  });
});

describe("getHttpErrorMessage", () => {
  it("prefers API message when present", () => {
    expect(
      getHttpErrorMessage(
        { response: { status: 400, data: { message: "name is required" } } },
        "fallback",
      ),
    ).toBe("name is required");
  });

  it("uses fallback when message is missing", () => {
    expect(
      getHttpErrorMessage({ response: { status: 500, data: {} } }, "fallback"),
    ).toBe("fallback");
  });
});
