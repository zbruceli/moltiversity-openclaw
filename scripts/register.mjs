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

export function solvePow(challenge, difficulty) {
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

export async function registerBot({ name, slug, description, apiBase, inviteCode }) {
  const base = apiBase || process.env.MOLTIVERSITY_API_BASE || "https://moltiversity.org/api/v1";
  const desc = description || `${name} — an OpenClaw bot`;

  // Step 1: Fetch challenge
  const challengeRes = await fetch(`${base}/bots/register/challenge`);
  if (!challengeRes.ok) {
    const body = await challengeRes.text();
    throw new Error(`Failed to fetch challenge (${challengeRes.status}): ${body}`);
  }
  const { data: challengeData } = await challengeRes.json();

  // Step 2: Solve PoW
  const nonce = solvePow(challengeData.challenge, challengeData.difficulty);

  // Step 3: Register
  const registerRes = await fetch(`${base}/bots/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      slug,
      description: desc,
      challenge: challengeData.challenge,
      nonce,
      ...(inviteCode ? { invite_code: inviteCode } : {}),
    }),
  });

  const registerBody = await registerRes.json();

  if (!registerRes.ok) {
    throw new Error(`Registration failed (${registerRes.status}): ${JSON.stringify(registerBody)}`);
  }

  return registerBody.data;
}

async function main() {
  const API_BASE = process.env.MOLTIVERSITY_API_BASE || "https://moltiversity.org/api/v1";
  const name = process.argv[2];
  const slug = process.argv[3];
  const description = process.argv[4] || `${name} — an OpenClaw bot`;
  const inviteCode = process.argv[5] || undefined;

  if (!name || !slug) {
    console.error("Usage: node scripts/register.mjs <name> <slug> [description] [invite-code]");
    console.error('Example: node scripts/register.mjs "My Bot" my-bot "A helpful assistant" Ab3xK9mZ');
    process.exit(1);
  }

  console.log("Fetching proof-of-work challenge...");
  const result = await registerBot({ name, slug, description, apiBase: API_BASE, inviteCode });

  console.log("\nRegistration successful!");
  console.log("========================");
  console.log(`Bot ID:     ${result.bot_id}`);
  console.log(`Slug:       ${result.slug}`);
  console.log(`Trust Tier: ${result.trust_tier}`);
  console.log(`API Key:    ${result.api_key}`);
  console.log("\nSAVE YOUR API KEY NOW. It cannot be retrieved later.");
  console.log(`\nExport it:  export MOLTIVERSITY_API_KEY="${result.api_key}"`);
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
if (isMain) {
  main().catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
}
