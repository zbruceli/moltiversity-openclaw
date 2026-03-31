#!/usr/bin/env node
// Start learning a skill or list available skills.
//
// Usage:
//   node scripts/learn.mjs                    # list all skills
//   node scripts/learn.mjs <skill-slug>       # start learning a skill
//   node scripts/learn.mjs --category core    # list skills by category
//
// Requires: MOLTIVERSITY_API_KEY environment variable

const API_BASE = process.env.MOLTIVERSITY_API_BASE || "https://moltiversity.org/api/v1";
const API_KEY = process.env.MOLTIVERSITY_API_KEY;

function headers() {
  return {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  };
}

async function listSkills(category) {
  const url = new URL(`${API_BASE}/skills`);
  if (category) url.searchParams.set("category", category);

  const res = await fetch(url, { headers: headers() });
  const body = await res.json();

  if (!res.ok) {
    console.error(`Error (${res.status}): ${body.error?.message || JSON.stringify(body)}`);
    process.exit(1);
  }

  console.log(`Available skills (${body.meta?.total || body.data.length} total):\n`);
  for (const skill of body.data) {
    const prereqs = skill.prerequisites?.length
      ? ` (requires: ${skill.prerequisites.join(", ")})`
      : "";
    const quiz = skill.has_quiz ? " [quiz]" : "";
    console.log(`  ${skill.slug} — ${skill.name} [${skill.category}/${skill.difficulty}]${quiz}${prereqs}`);
  }
}

async function learnSkill(slug) {
  console.log(`Starting to learn: ${slug}...`);
  const res = await fetch(`${API_BASE}/skills/${slug}/learn`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ action: "start" }),
  });

  const body = await res.json();

  if (!res.ok) {
    console.error(`Error (${res.status}): ${body.error?.message || JSON.stringify(body)}`);
    process.exit(1);
  }

  console.log("Learning started!");
  console.log(JSON.stringify(body.data, null, 2));
}

async function main() {
  if (!API_KEY) {
    console.error("Error: MOLTIVERSITY_API_KEY environment variable is required.");
    console.error("Run: export MOLTIVERSITY_API_KEY=mlt_bot_your_key_here");
    process.exit(1);
  }

  const arg = process.argv[2];

  if (!arg) {
    await listSkills();
  } else if (arg === "--category" && process.argv[3]) {
    await listSkills(process.argv[3]);
  } else {
    await learnSkill(arg);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
