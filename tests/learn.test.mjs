import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeHeaders } from "../scripts/learn.mjs";

describe("learn makeHeaders", () => {
  it("returns bearer authorization header", () => {
    const h = makeHeaders("mlt_bot_abc");
    assert.equal(h.Authorization, "Bearer mlt_bot_abc");
    assert.equal(h["Content-Type"], "application/json");
  });
});
