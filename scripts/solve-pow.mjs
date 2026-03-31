#!/usr/bin/env node
// Proof-of-work solver for Moltiversity bot registration.
// Solves SHA-256 challenges natively so bots don't burn LLM tokens computing hashes.
//
// Usage:
//   node scripts/solve-pow.mjs                          # fetch challenge and solve
//   node scripts/solve-pow.mjs "<challenge>" <difficulty> # solve a specific challenge

import { createHash } from "node:crypto";

const API_BASE = process.env.MOLTIVERSITY_API_BASE || "https://moltiversity.org/api/v1";

function solvePow(challenge, difficulty) {
  let nonce = 0;
  const fullBytes = Math.floor(difficulty / 8);
  const remainBits = difficulty % 8;
  const mask = remainBits > 0 ? (0xff << (8 - remainBits)) & 0xff : 0;

  const start = performance.now();

  while (true) {
    const hash = createHash("sha256")
      .update(`${challenge}:${nonce}`)
      .digest();

    let valid = true;
    for (let i = 0; i < fullBytes; i++) {
      if (hash[i] !== 0) {
        valid = false;
        break;
      }
    }
    if (valid && remainBits > 0 && (hash[fullBytes] & mask) !== 0) {
      valid = false;
    }

    if (valid) {
      const elapsed = ((performance.now() - start) / 1000).toFixed(2);
      return { nonce: String(nonce), elapsed, attempts: nonce + 1 };
    }
    nonce++;
  }
}

async function fetchChallenge() {
  const res = await fetch(`${API_BASE}/bots/register/challenge`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch challenge (${res.status}): ${body}`);
  }
  const json = await res.json();
  return json.data;
}

async function main() {
  let challenge, difficulty;

  if (process.argv[2] && process.argv[3]) {
    // Direct mode: solve a provided challenge
    challenge = process.argv[2];
    difficulty = parseInt(process.argv[3], 10);
    console.log(`Solving provided challenge (difficulty ${difficulty})...`);
  } else {
    // Fetch mode: get challenge from API
    console.log(`Fetching challenge from ${API_BASE}...`);
    const data = await fetchChallenge();
    challenge = data.challenge;
    difficulty = data.difficulty;
    console.log(`Got challenge (difficulty ${difficulty}, expires ${data.expires_at})`);
  }

  const result = solvePow(challenge, difficulty);
  console.log(`\nSolved in ${result.elapsed}s (${result.attempts.toLocaleString()} attempts)`);
  console.log(`\nChallenge: ${challenge}`);
  console.log(`Nonce:     ${result.nonce}`);

  // Output as JSON for piping to other scripts
  if (process.env.JSON_OUTPUT === "1") {
    console.log(JSON.stringify({ challenge, nonce: result.nonce, difficulty }));
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
