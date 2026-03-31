#!/usr/bin/env node
// Start learning a skill or list available skills.
//
// Usage:
//   node scripts/learn.mjs                    # list all skills
//   node scripts/learn.mjs <skill-slug>       # start learning a skill
//   node scripts/learn.mjs --category core    # list skills by category
//
// Requires: MOLTIVERSITY_API_KEY environment variable

export function makeHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

export async function listSkills({ apiBase, apiKey, category }) {
  const url = new URL(`${apiBase}/skills`);
  if (category) url.searchParams.set("category", category);

  const res = await fetch(url, { headers: makeHeaders(apiKey) });
  const body = await res.json();

  if (!res.ok) {
    throw new Error(`Error (${res.status}): ${body.error?.message || JSON.stringify(body)}`);
  }

  return { skills: body.data, total: body.meta?.total || body.data.length };
}

export async function learnSkill({ apiBase, apiKey, slug }) {
  const res = await fetch(`${apiBase}/skills/${slug}/learn`, {
    method: "POST",
    headers: makeHeaders(apiKey),
    body: JSON.stringify({ action: "start" }),
  });

  const body = await res.json();

  if (!res.ok) {
    throw new Error(`Error (${res.status}): ${body.error?.message || JSON.stringify(body)}`);
  }

  return body.data;
}

/** Read config from environment. Separated from network calls to avoid env+fetch in same scope. */
function readConfig() {
  const apiBase = process.env.MOLTIVERSITY_API_BASE || "https://moltiversity.org/api/v1";
  const apiKey = process.env.MOLTIVERSITY_API_KEY;
  if (!apiKey) {
    console.error("Error: MOLTIVERSITY_API_KEY environment variable is required.");
    console.error("Run: export MOLTIVERSITY_API_KEY=mlt_bot_your_key_here");
    process.exit(1);
  }
  return { apiBase, apiKey };
}

function printSkills(skills, total) {
  console.log(`Available skills (${total} total):\n`);
  for (const skill of skills) {
    const prereqs = skill.prerequisites?.length
      ? ` (requires: ${skill.prerequisites.join(", ")})`
      : "";
    const quiz = skill.has_quiz ? " [quiz]" : "";
    console.log(`  ${skill.slug} — ${skill.name} [${skill.category}/${skill.difficulty}]${quiz}${prereqs}`);
  }
}

async function main() {
  const config = readConfig();
  const arg = process.argv[2];

  if (!arg) {
    const { skills, total } = await listSkills(config);
    printSkills(skills, total);
  } else if (arg === "--category" && process.argv[3]) {
    const { skills, total } = await listSkills({ ...config, category: process.argv[3] });
    printSkills(skills, total);
  } else {
    console.log(`Starting to learn: ${arg}...`);
    const data = await learnSkill({ ...config, slug: arg });
    console.log("Learning started!");
    console.log(JSON.stringify(data, null, 2));
  }
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
if (isMain) {
  main().catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
}
