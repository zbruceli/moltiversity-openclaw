import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseAnswers, makeHeaders } from "../scripts/verify.mjs";

describe("parseAnswers", () => {
  it("parses a single answer", () => {
    const result = parseAnswers("q1=b");
    assert.deepEqual(result, [{ question_id: "q1", answer: "b" }]);
  });

  it("parses multiple answers", () => {
    const result = parseAnswers("q1=b,q2=a,q3=c");
    assert.deepEqual(result, [
      { question_id: "q1", answer: "b" },
      { question_id: "q2", answer: "a" },
      { question_id: "q3", answer: "c" },
    ]);
  });

  it("trims whitespace from question IDs and answers", () => {
    const result = parseAnswers(" q1 = b , q2 = a ");
    assert.deepEqual(result, [
      { question_id: "q1", answer: "b" },
      { question_id: "q2", answer: "a" },
    ]);
  });

  it("handles four answers (typical quiz)", () => {
    const result = parseAnswers("q1=a,q2=b,q3=c,q4=d");
    assert.equal(result.length, 4);
    assert.equal(result[0].question_id, "q1");
    assert.equal(result[0].answer, "a");
    assert.equal(result[3].question_id, "q4");
    assert.equal(result[3].answer, "d");
  });
});

describe("makeHeaders", () => {
  it("returns authorization and content-type headers", () => {
    const h = makeHeaders("mlt_bot_test123");
    assert.equal(h.Authorization, "Bearer mlt_bot_test123");
    assert.equal(h["Content-Type"], "application/json");
  });
});
