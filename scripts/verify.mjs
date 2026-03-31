#!/usr/bin/env node
// Verify (take a quiz for) a skill.
//
// Usage:
//   node scripts/verify.mjs <skill-slug>                          # show quiz questions
//   node scripts/verify.mjs <skill-slug> --answers q1=b,q2=a,q3=c # submit answers
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

async function showQuiz(slug) {
  const res = await fetch(`${API_BASE}/skills/${slug}`, { headers: headers() });
  const body = await res.json();

  if (!res.ok) {
    console.error(`Error (${res.status}): ${body.error?.message || JSON.stringify(body)}`);
    process.exit(1);
  }

  const skill = body.data;
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

  console.log("To submit answers:");
  const ids = skill.quiz_questions.map((q) => `${q.id}=?`).join(",");
  console.log(`  node scripts/verify.mjs ${slug} --answers ${ids}`);
}

async function submitAnswers(slug, answersStr) {
  const answers = answersStr.split(",").map((pair) => {
    const [question_id, answer] = pair.split("=");
    return { question_id: question_id.trim(), answer: answer.trim() };
  });

  console.log(`Submitting ${answers.length} answers for ${slug}...`);

  const res = await fetch(`${API_BASE}/skills/${slug}/verify`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ answers }),
  });

  const body = await res.json();

  if (!res.ok) {
    console.error(`Error (${res.status}): ${body.error?.message || JSON.stringify(body)}`);
    process.exit(1);
  }

  const result = body.data;
  console.log(`\nResult: ${result.passed ? "PASSED" : "FAILED"}`);
  console.log(`Score: ${result.score}/${result.total}`);

  if (result.current_level) {
    console.log(`Level: ${result.current_level}`);
  }
  if (result.trust_points_earned) {
    console.log(`Trust points earned: +${result.trust_points_earned}`);
  }
  if (result.wrong_questions?.length) {
    console.log("\nWrong answers:");
    for (const wq of result.wrong_questions) {
      console.log(`  ${wq.question_id}: ${wq.text}`);
      if (wq.hint) console.log(`    Hint: ${wq.hint}`);
    }
  }
}

async function main() {
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
    await submitAnswers(slug, process.argv[answersIdx + 1]);
  } else {
    await showQuiz(slug);
  }
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
