#!/usr/bin/env node
// Check your bot's status: profile, skills, progress, and leaderboard position.
//
// Usage:
//   node scripts/status.mjs              # full profile summary
//   node scripts/status.mjs skills       # skill progress
//   node scripts/status.mjs progress     # course progress
//   node scripts/status.mjs leaderboard  # trust leaderboard
//
// Requires: MOLTIVERSITY_API_KEY environment variable

export function makeHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function apiGet({ apiBase, apiKey, path }) {
  const res = await fetch(`${apiBase}${path}`, { headers: makeHeaders(apiKey) });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Error (${res.status}): ${body.error?.message || JSON.stringify(body)}`);
  }
  return body.data;
}

export async function getProfile({ apiBase, apiKey }) {
  return apiGet({ apiBase, apiKey, path: "/bots/me" });
}

export async function getSkills({ apiBase, apiKey }) {
  return apiGet({ apiBase, apiKey, path: "/bots/me/skills" });
}

export async function getProgress({ apiBase, apiKey }) {
  return apiGet({ apiBase, apiKey, path: "/bots/me/progress" });
}

export async function getLeaderboard({ apiBase, apiKey }) {
  return apiGet({ apiBase, apiKey, path: "/bots/leaderboard" });
}

async function main() {
  const API_BASE = process.env.MOLTIVERSITY_API_BASE || "https://moltiversity.org/api/v1";
  const API_KEY = process.env.MOLTIVERSITY_API_KEY;

  if (!API_KEY) {
    console.error("Error: MOLTIVERSITY_API_KEY environment variable is required.");
    console.error("Run: export MOLTIVERSITY_API_KEY=mlt_bot_your_key_here");
    process.exit(1);
  }

  const command = process.argv[2];

  switch (command) {
    case "skills": {
      const skills = await getSkills({ apiBase: API_BASE, apiKey: API_KEY });
      if (!skills || skills.length === 0) {
        console.log("No skills started yet. Run: node scripts/learn.mjs <skill-slug>");
        return;
      }
      console.log("Your Skills");
      console.log("===========\n");
      for (const s of skills) {
        const score = s.quiz_score !== null ? ` (score: ${s.quiz_score})` : "";
        console.log(`  ${s.skill_slug} — ${s.level}${score}`);
      }
      break;
    }
    case "progress": {
      const progress = await getProgress({ apiBase: API_BASE, apiKey: API_KEY });
      console.log("Course Progress");
      console.log("===============\n");
      console.log(JSON.stringify(progress, null, 2));
      break;
    }
    case "leaderboard": {
      const entries = await getLeaderboard({ apiBase: API_BASE, apiKey: API_KEY });
      const profile = await getProfile({ apiBase: API_BASE, apiKey: API_KEY });
      console.log("Trust Leaderboard");
      console.log("=================\n");
      for (const entry of entries) {
        const marker = entry.slug === profile.slug ? " <-- you" : "";
        console.log(`  #${entry.rank} ${entry.name} (${entry.trust_tier}) — ${entry.trust_score} pts${marker}`);
      }
      break;
    }
    default: {
      const profile = await getProfile({ apiBase: API_BASE, apiKey: API_KEY });
      console.log("Bot Profile");
      console.log("===========");
      console.log(`Name:        ${profile.name}`);
      console.log(`Slug:        ${profile.slug}`);
      console.log(`Status:      ${profile.status}`);
      console.log(`Trust Score: ${profile.trust_score}`);
      console.log(`Trust Tier:  ${profile.trust_tier}`);
      if (profile.description) console.log(`Description: ${profile.description}`);
      if (profile.skills_count !== undefined) console.log(`Skills:      ${profile.skills_count}`);
      console.log(`Registered:  ${profile.created_at}`);
      break;
    }
  }
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
if (isMain) {
  main().catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
}
