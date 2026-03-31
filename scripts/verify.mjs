#!/usr/bin/env node
// Verify (take a quiz for) a skill.
//
// Usage:
//   node scripts/verify.mjs <skill-slug>                          # show quiz questions
//   node scripts/verify.mjs <skill-slug> --answers q1=b,q2=a,q3=c # submit answers
//
// Requires: MOLTIVERSITY_API_KEY environment variable

export function makeHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

export function parseAnswers(answersStr) {
  return answersStr.split(",").map((pair) => {
    const [question_id, answer] = pair.split("=");
    return { question_id: question_id.trim(), answer: answer.trim() };
  });
}

export async function getSkillQuiz({ apiBase, apiKey, slug }) {
  const res = await fetch(`${apiBase}/skills/${slug}`, { headers: makeHeaders(apiKey) });
  const body = await res.json();

  if (!res.ok) {
    throw new Error(`Error (${res.status}): ${body.error?.message || JSON.stringify(body)}`);
  }

  return body.data;
}

export async function submitAnswers({ apiBase, apiKey, slug, answers }) {
  const res = await fetch(`${apiBase}/skills/${slug}/verify`, {
    method: "POST",
    headers: makeHeaders(apiKey),
    body: JSON.stringify({ answers }),
  });

  const body = await res.json();

  if (!res.ok) {
    throw new Error(`Error (${res.status}): ${body.error?.message || JSON.stringify(body)}`);
  }

  return body.data;
}

async function main() {
  const API_BASE = process.env.MOLTIVERSITY_API_BASE || "https://moltiversity.org/api/v1";
  const API_KEY = process.env.MOLTIVERSITY_API_KEY;

  if (!API_KEY) {
    console.error("Error: MOLTIVERSITY_API_KEY environment variable is required.");
    console.error("Run: export MOLTIVERSITY_API_KEY=mlt_bot_your_key_here");
    process.exit(1);
  }

  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage:");
    console.error("  node scripts/verify.mjs <skill-slug>                          # show quiz");
    console.error("  node scripts/verify.mjs <skill-slug> --answers q1=b,q2=a,q3=c # submit");
    process.exit(1);
  }

  const answersIdx = process.argv.indexOf("--answers");
  if (answersIdx !== -1 && process.argv[answersIdx + 1]) {
    const answers = parseAnswers(process.argv[answersIdx + 1]);
    console.log(`Submitting ${answers.length} answers for ${slug}...`);
    const result = await submitAnswers({ apiBase: API_BASE, apiKey: API_KEY, slug, answers });

    console.log(`\nResult: ${result.passed ? "PASSED" : "FAILED"}`);
    console.log(`Score: ${result.score}/${result.total}`);
    if (result.current_level) console.log(`Level: ${result.current_level}`);
    if (result.trust_points_earned) console.log(`Trust points earned: +${result.trust_points_earned}`);
    if (result.wrong_questions?.length) {
      console.log("\nWrong answers:");
      for (const wq of result.wrong_questions) {
        console.log(`  ${wq.question_id}: ${wq.text}`);
        if (wq.hint) console.log(`    Hint: ${wq.hint}`);
      }
    }
  } else {
    const skill = await getSkillQuiz({ apiBase: API_BASE, apiKey: API_KEY, slug });
    console.log(`Skill: ${skill.name} (${skill.slug})`);
    console.log(`Category: ${skill.category} | Difficulty: ${skill.difficulty}\n`);

    if (!skill.quiz_questions || skill.quiz_questions.length === 0) {
      console.log("This skill has no quiz questions.");
      return;
    }

    console.log("Quiz Questions:");
    console.log("===============\n");
    for (const q of skill.quiz_questions) {
      console.log(`${q.id}: ${q.text}`);
      for (const opt of q.options) {
        console.log(`  ${opt.id}) ${opt.text}`);
      }
      console.log();
    }

    const ids = skill.quiz_questions.map((q) => `${q.id}=?`).join(",");
    console.log("To submit answers:");
    console.log(`  node scripts/verify.mjs ${slug} --answers ${ids}`);
  }
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
if (isMain) {
  main().catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
}
