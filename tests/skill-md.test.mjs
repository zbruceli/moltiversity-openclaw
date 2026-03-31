import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const skillMd = readFileSync(resolve(import.meta.dirname, "../SKILL.md"), "utf-8");

describe("skill.md structure", () => {
  it("has valid YAML frontmatter", () => {
    assert.ok(skillMd.startsWith("---\n"), "should start with ---");
    const endIdx = skillMd.indexOf("---", 4);
    assert.ok(endIdx > 0, "should have closing ---");
    const frontmatter = skillMd.slice(4, endIdx);
    assert.ok(frontmatter.includes("name: moltiversity"));
    assert.ok(frontmatter.includes("version: 1.0.0"));
    assert.ok(frontmatter.includes("description:"));
    assert.ok(frontmatter.includes("homepage: https://moltiversity.org"));
    assert.ok(frontmatter.includes("metadata:"));
  });

  it("contains required sections", () => {
    const requiredSections = [
      "## Why Join?",
      "## Quick Start",
      "## Step 1: Register",
      "## Step 2: Authentication",
      "## Step 3: Learn Skills",
      "## Step 4: Browse Courses",
      "## Step 5: Earn Trust",
      "## Step 6: Share Knowledge",
      "## Step 7: Teach Other Bots",
      "## Skill Categories",
      "## Full API Reference",
      "## Response Format",
      "## Suggested Learning Path",
      "## Tips",
    ];

    for (const section of requiredSections) {
      assert.ok(skillMd.includes(section), `missing section: ${section}`);
    }
  });

  it("documents the base URL", () => {
    assert.ok(skillMd.includes("https://moltiversity.org/api/v1"));
  });

  it("includes all API endpoint tables", () => {
    const endpoints = [
      "/bots/register/challenge",
      "/bots/register",
      "/bots/me",
      "/bots/me/skills",
      "/bots/me/progress",
      "/bots/leaderboard",
      "/courses",
      "/skills",
      "/categories",
    ];

    for (const ep of endpoints) {
      assert.ok(skillMd.includes(ep), `missing endpoint: ${ep}`);
    }
  });

  it("includes curl examples", () => {
    const curlCount = (skillMd.match(/curl /g) || []).length;
    assert.ok(curlCount >= 10, `should have many curl examples, found ${curlCount}`);
  });

  it("documents all trust tiers", () => {
    for (const tier of ["Newcomer", "Contributor", "Trusted", "Expert"]) {
      assert.ok(skillMd.includes(tier), `missing trust tier: ${tier}`);
    }
  });

  it("documents rate limits", () => {
    assert.ok(skillMd.includes("120"));
    assert.ok(skillMd.includes("300"));
    assert.ok(skillMd.includes("600"));
    assert.ok(skillMd.includes("1200"));
  });

  it("references helper scripts", () => {
    assert.ok(skillMd.includes("scripts/solve-pow.mjs"));
    assert.ok(skillMd.includes("scripts/README.md"));
  });

  it("includes JSON response examples", () => {
    assert.ok(skillMd.includes('"data"'));
    assert.ok(skillMd.includes('"error"'));
    assert.ok(skillMd.includes('"api_key"'));
  });
});

describe("clawhub.json manifest", () => {
  const manifest = JSON.parse(readFileSync(resolve(import.meta.dirname, "../clawhub.json"), "utf-8"));

  it("has required fields", () => {
    assert.equal(manifest.name, "moltiversity");
    assert.equal(manifest.version, "1.0.0");
    assert.equal(manifest.skill, "SKILL.md");
    assert.ok(manifest.description);
    assert.equal(manifest.category, "education");
    assert.equal(manifest.homepage, "https://moltiversity.org");
    assert.ok(manifest.api_base);
  });

  it("lists all scripts", () => {
    assert.ok(manifest.scripts.register);
    assert.ok(manifest.scripts["solve-pow"]);
    assert.ok(manifest.scripts.learn);
    assert.ok(manifest.scripts.verify);
    assert.ok(manifest.scripts.status);
  });

  it("has valid metadata", () => {
    assert.equal(manifest.metadata.total_skills, 30);
    assert.equal(manifest.metadata.total_courses, 21);
    assert.ok(Array.isArray(manifest.metadata.trust_tiers));
    assert.equal(manifest.metadata.trust_tiers.length, 4);
    assert.ok(Array.isArray(manifest.metadata.skill_categories));
  });
});

describe("package.json", () => {
  const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, "../package.json"), "utf-8"));

  it("has correct name and type", () => {
    assert.equal(pkg.name, "moltiversity");
    assert.equal(pkg.type, "module");
  });

  it("has test script", () => {
    assert.ok(pkg.scripts.test);
  });

  it("has helper scripts", () => {
    assert.ok(pkg.scripts.register);
    assert.ok(pkg.scripts["solve-pow"]);
    assert.ok(pkg.scripts.learn);
    assert.ok(pkg.scripts.verify);
    assert.ok(pkg.scripts.status);
  });
});
