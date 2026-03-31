import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

// These tests mock global fetch to verify API call behavior without hitting the real server.

describe("register flow", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("registerBot calls challenge then register endpoints", async () => {
    const calls = [];

    globalThis.fetch = async (url, opts) => {
      calls.push({ url: url.toString(), method: opts?.method || "GET" });

      if (url.toString().includes("/challenge")) {
        return {
          ok: true,
          json: async () => ({
            data: { challenge: "test:123:hmac", difficulty: 1, expires_at: "2026-12-31T00:00:00Z" },
          }),
        };
      }
      if (url.toString().includes("/register")) {
        return {
          ok: true,
          json: async () => ({
            data: {
              bot_id: "uuid-123",
              slug: "test-bot",
              api_key: "mlt_bot_testkey",
              trust_tier: "newcomer",
            },
          }),
        };
      }
      return { ok: false, text: async () => "unexpected" };
    };

    const { registerBot } = await import("../scripts/register.mjs");
    const result = await registerBot({
      name: "Test Bot",
      slug: "test-bot",
      description: "A test bot",
      apiBase: "http://localhost:3000/api/v1",
    });

    assert.equal(calls.length, 2);
    assert.ok(calls[0].url.includes("/challenge"));
    assert.ok(calls[1].url.includes("/register"));
    assert.equal(calls[1].method, "POST");
    assert.equal(result.slug, "test-bot");
    assert.equal(result.api_key, "mlt_bot_testkey");
    assert.equal(result.trust_tier, "newcomer");
  });

  it("registerBot throws on challenge failure", async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 500,
      text: async () => "internal error",
    });

    const { registerBot } = await import("../scripts/register.mjs");
    await assert.rejects(
      () => registerBot({ name: "X", slug: "x", apiBase: "http://localhost:3000/api/v1" }),
      /Failed to fetch challenge/
    );
  });
});

describe("learn API calls", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("listSkills fetches /skills with auth header", async () => {
    let capturedUrl, capturedHeaders;

    globalThis.fetch = async (url, opts) => {
      capturedUrl = url.toString();
      capturedHeaders = opts?.headers;
      return {
        ok: true,
        json: async () => ({
          data: [
            { slug: "openclaw-installation", name: "OpenClaw Installation", category: "core", difficulty: "beginner", has_quiz: true, prerequisites: [] },
          ],
          meta: { total: 1 },
        }),
      };
    };

    const { listSkills } = await import("../scripts/learn.mjs");
    const result = await listSkills({
      apiBase: "http://localhost:3000/api/v1",
      apiKey: "mlt_bot_test",
    });

    assert.ok(capturedUrl.includes("/skills"));
    assert.equal(capturedHeaders.Authorization, "Bearer mlt_bot_test");
    assert.equal(result.total, 1);
    assert.equal(result.skills[0].slug, "openclaw-installation");
  });

  it("listSkills adds category param when provided", async () => {
    let capturedUrl;

    globalThis.fetch = async (url) => {
      capturedUrl = url.toString();
      return { ok: true, json: async () => ({ data: [], meta: { total: 0 } }) };
    };

    const { listSkills } = await import("../scripts/learn.mjs");
    await listSkills({
      apiBase: "http://localhost:3000/api/v1",
      apiKey: "mlt_bot_test",
      category: "core",
    });

    assert.ok(capturedUrl.includes("category=core"));
  });

  it("learnSkill POSTs to /skills/{slug}/learn", async () => {
    let capturedUrl, capturedMethod, capturedBody;

    globalThis.fetch = async (url, opts) => {
      capturedUrl = url.toString();
      capturedMethod = opts?.method;
      capturedBody = opts?.body;
      return { ok: true, json: async () => ({ data: { status: "learning" } }) };
    };

    const { learnSkill } = await import("../scripts/learn.mjs");
    const result = await learnSkill({
      apiBase: "http://localhost:3000/api/v1",
      apiKey: "mlt_bot_test",
      slug: "openclaw-installation",
    });

    assert.ok(capturedUrl.includes("/skills/openclaw-installation/learn"));
    assert.equal(capturedMethod, "POST");
    assert.ok(capturedBody.includes('"action":"start"'));
    assert.equal(result.status, "learning");
  });

  it("learnSkill throws on API error", async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 404,
      json: async () => ({ error: { message: "Skill not found" } }),
    });

    const { learnSkill } = await import("../scripts/learn.mjs");
    await assert.rejects(
      () => learnSkill({ apiBase: "http://localhost:3000/api/v1", apiKey: "mlt_bot_test", slug: "nonexistent" }),
      /Skill not found/
    );
  });
});

describe("verify API calls", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("getSkillQuiz fetches skill detail", async () => {
    globalThis.fetch = async (url) => ({
      ok: true,
      json: async () => ({
        data: {
          slug: "openclaw-installation",
          name: "OpenClaw Installation",
          category: "core",
          difficulty: "beginner",
          quiz_questions: [
            { id: "q1", text: "What is OpenClaw?", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }] },
          ],
        },
      }),
    });

    const { getSkillQuiz } = await import("../scripts/verify.mjs");
    const skill = await getSkillQuiz({
      apiBase: "http://localhost:3000/api/v1",
      apiKey: "mlt_bot_test",
      slug: "openclaw-installation",
    });

    assert.equal(skill.slug, "openclaw-installation");
    assert.equal(skill.quiz_questions.length, 1);
    assert.equal(skill.quiz_questions[0].id, "q1");
  });

  it("submitAnswers POSTs answers and returns result", async () => {
    let capturedBody;

    globalThis.fetch = async (url, opts) => {
      capturedBody = JSON.parse(opts?.body);
      return {
        ok: true,
        json: async () => ({
          data: { passed: true, score: 3, total: 4, current_level: "practiced", trust_points_earned: 5 },
        }),
      };
    };

    const { submitAnswers } = await import("../scripts/verify.mjs");
    const result = await submitAnswers({
      apiBase: "http://localhost:3000/api/v1",
      apiKey: "mlt_bot_test",
      slug: "openclaw-installation",
      answers: [
        { question_id: "q1", answer: "b" },
        { question_id: "q2", answer: "a" },
        { question_id: "q3", answer: "c" },
      ],
    });

    assert.equal(capturedBody.answers.length, 3);
    assert.equal(result.passed, true);
    assert.equal(result.score, 3);
    assert.equal(result.trust_points_earned, 5);
  });
});

describe("status API calls", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("getProfile fetches /bots/me", async () => {
    let capturedUrl;

    globalThis.fetch = async (url) => {
      capturedUrl = url.toString();
      return {
        ok: true,
        json: async () => ({
          data: { name: "TestBot", slug: "test-bot", status: "active", trust_score: 15, trust_tier: "contributor" },
        }),
      };
    };

    const { getProfile } = await import("../scripts/status.mjs");
    const profile = await getProfile({
      apiBase: "http://localhost:3000/api/v1",
      apiKey: "mlt_bot_test",
    });

    assert.ok(capturedUrl.includes("/bots/me"));
    assert.equal(profile.name, "TestBot");
    assert.equal(profile.trust_tier, "contributor");
  });

  it("getSkills fetches /bots/me/skills", async () => {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        data: [
          { skill_slug: "openclaw-installation", level: "verified", quiz_score: 4 },
          { skill_slug: "channel-connection", level: "practiced", quiz_score: 3 },
        ],
      }),
    });

    const { getSkills } = await import("../scripts/status.mjs");
    const skills = await getSkills({
      apiBase: "http://localhost:3000/api/v1",
      apiKey: "mlt_bot_test",
    });

    assert.equal(skills.length, 2);
    assert.equal(skills[0].skill_slug, "openclaw-installation");
    assert.equal(skills[0].level, "verified");
  });

  it("getLeaderboard fetches /bots/leaderboard", async () => {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        data: [
          { rank: 1, slug: "top-bot", name: "Top Bot", trust_tier: "expert", trust_score: 150 },
          { rank: 2, slug: "test-bot", name: "TestBot", trust_tier: "contributor", trust_score: 15 },
        ],
      }),
    });

    const { getLeaderboard } = await import("../scripts/status.mjs");
    const entries = await getLeaderboard({
      apiBase: "http://localhost:3000/api/v1",
      apiKey: "mlt_bot_test",
    });

    assert.equal(entries.length, 2);
    assert.equal(entries[0].rank, 1);
    assert.equal(entries[1].slug, "test-bot");
  });

  it("apiGet throws on error response", async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: "Invalid API key" } }),
    });

    const { apiGet } = await import("../scripts/status.mjs");
    await assert.rejects(
      () => apiGet({ apiBase: "http://localhost:3000/api/v1", apiKey: "bad_key", path: "/bots/me" }),
      /Invalid API key/
    );
  });
});
