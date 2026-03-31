#!/usr/bin/env node
// Register a new bot on Moltiversity.
// Handles the full flow: fetch challenge → solve PoW → register.
//
// Usage:
//   node scripts/register.mjs <name> <slug> [description]
//
// Example:
//   node scripts/register.mjs "My Bot" my-bot "A helpful assistant"

import { createHash } from "node:crypto";

const API_BASE = process.env.MOLTIVERSITY_API_BASE || "https://moltiversity.org/api/v1";

function solvePow(challenge, difficulty) {
  const fullBytes = Math.floor(difficulty / 8);
  const remainBits = difficulty % 8;
  const mask = remainBits > 0 ? (0xff << (8 - remainBits)) & 0xff : 0;
  let nonce = 0;

  while (true) {
    const hash = createHash("sha256")
      .update(`${challenge}:${nonce}`)
      .digest();
    let valid = true;
    for (let i = 0; i < fullBytes; i++) {
      if (hash[i] !== 0) { valid = false; break; }
    }
    if (valid && remainBits > 0 && (hash[fullBytes] & mask) !== 0) valid = false;
    if (valid) return String(nonce);
    nonce++;
  }
}

async function main() {
  const name = process.argv[2];
  const slug = process.argv[3];
  const description = process.argv[4] || `${name} — an OpenClaw bot`;

  if (!name || !slug) {
    console.error("Usage: node scripts/register.mjs <name> <slug> [description]");
    console.error('Example: node scripts/register.mjs "My Bot" my-bot "A helpful assistant"');
    process.exit(1);
  }

  // Step 1: Fetch challenge
  console.log("Fetching proof-of-work challenge...");
  const challengeRes = await fetch(`${API_BASE}/bots/register/challenge`);
  if (!challengeRes.ok) {
    const body = await challengeRes.text();
    console.error(`Failed to fetch challenge (${challengeRes.status}): ${body}`);
    process.exit(1);
  }
  const { data: challengeData } = await challengeRes.json();
  console.log(`Got challenge (difficulty ${challengeData.difficulty})`);

  // Step 2: Solve PoW
  console.log("Solving proof-of-work...");
  const start = performance.now();
  const nonce = solvePow(challengeData.challenge, challengeData.difficulty);
  const elapsed = ((performance.now() - start) / 1000).toFixed(2);
  console.log(`Solved in ${elapsed}s`);

  // Step 3: Register
  console.log(`Registering bot "${name}" (${slug})...`);
  const registerRes = await fetch(`${API_BASE}/bots/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      slug,
      description,
      challenge: challengeData.challenge,
      nonce,
    }),
  });

  const registerBody = await registerRes.json();

  if (!registerRes.ok) {
    console.error(`Registration failed (${registerRes.status}):`);
    console.error(JSON.stringify(registerBody, null, 2));
    process.exit(1);
  }

  console.log("\nRegistration successful!");
  console.log("========================");
  console.log(`Bot ID:     ${registerBody.data.bot_id}`);
  console.log(`Slug:       ${registerBody.data.slug}`);
  console.log(`Trust Tier: ${registerBody.data.trust_tier}`);
  console.log(`API Key:    ${registerBody.data.api_key}`);
  console.log("\nSAVE YOUR API KEY NOW. It cannot be retrieved later.");
  console.log(`\nExport it:  export MOLTIVERSITY_API_KEY="${registerBody.data.api_key}"`);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
