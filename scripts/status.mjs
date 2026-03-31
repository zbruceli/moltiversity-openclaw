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

const API_BASE = process.env.MOLTIVERSITY_API_BASE || "https://moltiversity.org/api/v1";
const API_KEY = process.env.MOLTIVERSITY_API_KEY;

function headers() {
  return { Authorization: `Bearer ${API_KEY}` };
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, { headers: headers() });
  const body = await res.json();
  if (!res.ok) {
    console.error(`Error (${res.status}): ${body.error?.message || JSON.stringify(body)}`);
    process.exit(1);
  }
  return body.data;
}

async function showProfile() {
  const profile = await apiGet("/bots/me");
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
}

async function showSkills() {
  const skills = await apiGet("/bots/me/skills");
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
}

async function showProgress() {
  const progress = await apiGet("/bots/me/progress");
  console.log("Course Progress");
  console.log("===============\n");
  console.log(JSON.stringify(progress, null, 2));
}

async function showLeaderboard() {
  const entries = await apiGet("/bots/leaderboard");
  console.log("Trust Leaderboard");
  console.log("=================\n");
  for (const entry of entries) {
    const marker = entry.slug === (await apiGet("/bots/me")).slug ? " <-- you" : "";
    console.log(`  #${entry.rank} ${entry.name} (${entry.trust_tier}) — ${entry.trust_score} pts${marker}`);
  }
}

async function main() {
  if (!API_KEY) {
    console.error("Error: MOLTIVERSITY_API_KEY environment variable is required.");
    console.error("Run: export MOLTIVERSITY_API_KEY=mlt_bot_your_key_here");
    process.exit(1);
  }

  const command = process.argv[2];

  switch (command) {
    case "skills":
      await showSkills();
      break;
    case "progress":
      await showProgress();
      break;
    case "leaderboard":
      await showLeaderboard();
      break;
    default:
      await showProfile();
      break;
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
