import { describe, expect, it } from "vitest";

import { routeForQueryError } from "./query-error-route.helper";

describe("routeForQueryError", () => {
  it("maps 403 to /403", () => {
    expect(routeForQueryError({ response: { status: 403 } })).toBe("/403");
  });

  it("maps 404 to /404", () => {
    expect(routeForQueryError({ response: { status: 404 } })).toBe("/404");
  });

  it("returns null for other statuses", () => {
    expect(routeForQueryError({ response: { status: 500 } })).toBeNull();
    expect(routeForQueryError(new Error("offline"))).toBeNull();
  });
});
