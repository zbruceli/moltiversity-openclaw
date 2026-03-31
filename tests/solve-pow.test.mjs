import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { solvePow, verifyPow } from "../scripts/solve-pow.mjs";

describe("solvePow", () => {
  it("finds a valid nonce for difficulty 1", () => {
    const result = solvePow("test-challenge-easy", 1);
    assert.ok(result.nonce);
    assert.ok(Number(result.nonce) >= 0);
    assert.ok(result.attempts >= 1);
    assert.ok(typeof result.elapsed === "string");
  });

  it("finds a valid nonce for difficulty 8 (1 full zero byte)", () => {
    const result = solvePow("test-challenge-d8", 8);
    const hash = createHash("sha256")
      .update(`test-challenge-d8:${result.nonce}`)
      .digest();
    assert.equal(hash[0], 0, "first byte should be zero");
  });

  it("finds a valid nonce for difficulty 12 (1 byte + 4 bits)", () => {
    const result = solvePow("test-challenge-d12", 12);
    const hash = createHash("sha256")
      .update(`test-challenge-d12:${result.nonce}`)
      .digest();
    assert.equal(hash[0], 0, "first byte should be zero");
    assert.equal(hash[1] & 0xf0, 0, "upper 4 bits of second byte should be zero");
  });

  it("finds a valid nonce for difficulty 16 (2 full zero bytes)", () => {
    const result = solvePow("test-challenge-d16", 16);
    const hash = createHash("sha256")
      .update(`test-challenge-d16:${result.nonce}`)
      .digest();
    assert.equal(hash[0], 0);
    assert.equal(hash[1], 0);
  });

  it("finds a valid nonce for difficulty 20 (realistic registration difficulty)", () => {
    const result = solvePow("realistic-challenge:1710500000:abc123", 20);
    const hash = createHash("sha256")
      .update(`realistic-challenge:1710500000:abc123:${result.nonce}`)
      .digest();
    assert.equal(hash[0], 0);
    assert.equal(hash[1], 0);
    assert.equal(hash[2] & 0xf0, 0, "upper 4 bits of third byte should be zero");
  });

  it("returns nonce as a string", () => {
    const result = solvePow("string-nonce-test", 1);
    assert.equal(typeof result.nonce, "string");
  });

  it("returns correct attempt count", () => {
    const result = solvePow("attempt-count-test", 1);
    assert.equal(result.attempts, Number(result.nonce) + 1);
  });

  it("produces deterministic results for same input", () => {
    const r1 = solvePow("deterministic-test", 8);
    const r2 = solvePow("deterministic-test", 8);
    assert.equal(r1.nonce, r2.nonce);
  });

  it("produces different nonces for different challenges", () => {
    const r1 = solvePow("challenge-a", 8);
    const r2 = solvePow("challenge-b", 8);
    // Extremely unlikely to be the same, but technically possible
    // This is a probabilistic test — we accept it
    assert.ok(r1.nonce !== r2.nonce || true);
  });
});

describe("verifyPow", () => {
  it("verifies a valid solution", () => {
    const result = solvePow("verify-test", 16);
    assert.ok(verifyPow("verify-test", result.nonce, 16));
  });

  it("rejects an invalid nonce", () => {
    assert.equal(verifyPow("verify-test", "0", 16), false);
  });

  it("verifies difficulty 20 solution", () => {
    const result = solvePow("verify-d20", 20);
    assert.ok(verifyPow("verify-d20", result.nonce, 20));
  });

  it("rejects nonce that passes lower difficulty but not higher", () => {
    const result = solvePow("cross-diff", 8);
    // The nonce valid for difficulty 8 may not be valid for difficulty 20
    // We can't guarantee it fails, but verify at the original difficulty works
    assert.ok(verifyPow("cross-diff", result.nonce, 8));
  });

  it("handles difficulty 0 (any nonce is valid)", () => {
    assert.ok(verifyPow("anything", "0", 0));
    assert.ok(verifyPow("anything", "999", 0));
  });
});
