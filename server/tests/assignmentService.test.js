/**
 * Unit tests for the lead assignment logic.
 *
 * These are pure-logic tests that don't require a database.
 * They test the sorting/ranking algorithms directly.
 *
 * Run with:  node tests/assignmentService.test.js
 */

// ── Test helpers ──

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${message}`);
  } else {
    failed++;
    console.log(`  ❌ FAIL: ${message}`);
  }
}

function describe(name, fn) {
  console.log(`\n📦 ${name}`);
  fn();
}

function test(name, fn) {
  try {
    fn();
  } catch (err) {
    failed++;
    console.log(`  ❌ FAIL: ${name} — ${err.message}`);
  }
}

// ── Replicate the pure-logic parts of assignmentService ──

/**
 * Given an array of candidate objects, sort them:
 *   1. activeLeads ASC (fewest first)
 *   2. performanceScore DESC (best performer first)
 */
function sortCandidates(candidates) {
  return [...candidates].sort((a, b) => {
    if (a.activeLeads !== b.activeLeads) return a.activeLeads - b.activeLeads;
    return b.performanceScore - a.performanceScore;
  });
}

/**
 * Compute performance score from closed leads data.
 *   closedCount / (avgCompletionMs + 1)
 */
function computeScore(closedLeads) {
  if (closedLeads.length === 0) {
    return { avgCompletionMs: Infinity, closedCount: 0, performanceScore: 0 };
  }
  const totalMs = closedLeads.reduce(
    (sum, l) => sum + (l.closedAt - l.createdAt),
    0
  );
  const avg = totalMs / closedLeads.length;
  return {
    avgCompletionMs: avg,
    closedCount: closedLeads.length,
    performanceScore: closedLeads.length / (avg + 1),
  };
}

/**
 * Pick best assignee from sorted candidates.
 */
function suggestFromCandidates(candidates) {
  if (!candidates.length) return { suggested: null, candidates: [] };
  const sorted = sortCandidates(candidates);
  return { suggested: sorted[0], candidates: sorted };
}

// ══════════════════════════════════════════════════════
//  TEST CASES
// ══════════════════════════════════════════════════════

describe("computeScore — Performance metric", () => {
  test("zero closed leads → score 0", () => {
    const result = computeScore([]);
    assert(result.closedCount === 0, "closedCount is 0");
    assert(result.performanceScore === 0, "performanceScore is 0");
    assert(result.avgCompletionMs === Infinity, "avgCompletionMs is Infinity");
  });

  test("1 lead closed in 10 days → correct score", () => {
    const tenDays = 10 * 24 * 60 * 60 * 1000;
    const result = computeScore([{ createdAt: 0, closedAt: tenDays }]);
    assert(result.closedCount === 1, "closedCount is 1");
    assert(Math.abs(result.avgCompletionMs - tenDays) < 1, "avgCompletionMs ≈ 10 days");
    const expected = 1 / (tenDays + 1);
    assert(Math.abs(result.performanceScore - expected) < 1e-15, `score ≈ ${expected.toExponential(3)}`);
  });

  test("3 leads closed fast → higher score than 1 lead closed slow", () => {
    const oneDay = 24 * 60 * 60 * 1000;
    const fast = computeScore([
      { createdAt: 0, closedAt: oneDay },
      { createdAt: 0, closedAt: oneDay },
      { createdAt: 0, closedAt: oneDay },
    ]);
    const slow = computeScore([
      { createdAt: 0, closedAt: 10 * oneDay },
    ]);
    assert(fast.performanceScore > slow.performanceScore,
      `fast (${fast.performanceScore.toExponential(3)}) > slow (${slow.performanceScore.toExponential(3)})`);
  });
});

describe("sortCandidates — Ranking logic", () => {
  test("assigns to member with fewest active leads", () => {
    const candidates = [
      { userId: "u1", name: "Alice", activeLeads: 5, performanceScore: 0 },
      { userId: "u2", name: "Bob", activeLeads: 2, performanceScore: 0 },
    ];
    const sorted = sortCandidates(candidates);
    assert(sorted[0].userId === "u2", "Bob (2 active) comes first");
    assert(sorted[1].userId === "u1", "Alice (5 active) comes second");
  });

  test("tiebreaker: higher performance score wins when active counts equal", () => {
    const candidates = [
      { userId: "u1", name: "Alice", activeLeads: 3, performanceScore: 0.001 },
      { userId: "u2", name: "Bob", activeLeads: 3, performanceScore: 0.005 },
    ];
    const sorted = sortCandidates(candidates);
    assert(sorted[0].userId === "u2", "Bob (higher score) comes first");
    assert(sorted[1].userId === "u1", "Alice (lower score) comes second");
  });

  test("three-way tie broken correctly", () => {
    const candidates = [
      { userId: "u1", name: "Alice", activeLeads: 2, performanceScore: 0.001 },
      { userId: "u2", name: "Bob", activeLeads: 2, performanceScore: 0.010 },
      { userId: "u3", name: "Charlie", activeLeads: 2, performanceScore: 0.005 },
    ];
    const sorted = sortCandidates(candidates);
    assert(sorted[0].userId === "u2", "Bob (score .010) first");
    assert(sorted[1].userId === "u3", "Charlie (score .005) second");
    assert(sorted[2].userId === "u1", "Alice (score .001) third");
  });

  test("mixed active + performance sorting", () => {
    const candidates = [
      { userId: "u1", name: "Alice", activeLeads: 5, performanceScore: 0.999 },
      { userId: "u2", name: "Bob", activeLeads: 1, performanceScore: 0.001 },
      { userId: "u3", name: "Charlie", activeLeads: 1, performanceScore: 0.005 },
    ];
    const sorted = sortCandidates(candidates);
    assert(sorted[0].userId === "u3", "Charlie (1 active, better score) first");
    assert(sorted[1].userId === "u2", "Bob (1 active, lower score) second");
    assert(sorted[2].userId === "u1", "Alice (5 active) last despite best score");
  });
});

describe("suggestFromCandidates — Edge cases", () => {
  test("no candidates → returns null", () => {
    const result = suggestFromCandidates([]);
    assert(result.suggested === null, "suggested is null");
    assert(result.candidates.length === 0, "candidates is empty");
  });

  test("single candidate → returns that candidate", () => {
    const candidates = [
      { userId: "u1", name: "Alice", activeLeads: 3, performanceScore: 0 },
    ];
    const result = suggestFromCandidates(candidates);
    assert(result.suggested.userId === "u1", "suggested is Alice");
    assert(result.candidates.length === 1, "1 candidate");
  });

  test("all candidates have zero leads and zero score", () => {
    const candidates = [
      { userId: "u1", name: "Alice", activeLeads: 0, performanceScore: 0 },
      { userId: "u2", name: "Bob", activeLeads: 0, performanceScore: 0 },
    ];
    const result = suggestFromCandidates(candidates);
    assert(result.suggested !== null, "still suggests someone");
    assert(result.candidates.length === 2, "both listed");
  });
});

// ── Summary ──

console.log(`\n${"═".repeat(50)}`);
console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${"═".repeat(50)}\n`);

process.exit(failed > 0 ? 1 : 0);
