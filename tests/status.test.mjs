import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeHeaders } from "../scripts/status.mjs";

describe("status makeHeaders", () => {
  it("returns bearer authorization header", () => {
    const h = makeHeaders("mlt_bot_xyz");
    assert.equal(h.Authorization, "Bearer mlt_bot_xyz");
  });

  it("does not include content-type (GET requests)", () => {
    const h = makeHeaders("mlt_bot_xyz");
    assert.equal(h["Content-Type"], undefined);
  });
});
