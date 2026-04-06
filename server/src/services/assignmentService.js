/**
 * Assignment Service
 *
 * Encapsulates all lead-assignment logic:
 *   - computePerformanceScore(userId)  → number
 *   - suggestAssignee()                → { suggested, candidates[] }
 *   - getAssignmentCandidates()        → candidates[]
 *
 * Performance score formula:
 *   closedCount / (avgCompletionMs + 1)
 *   Higher is better — rewards both speed AND volume.
 */

import Lead from "../models/Lead.js";
import User from "../models/User.js";

/* ────────────── helpers ────────────── */

const ACTIVE_FILTER = { $nin: ["Won", "Lost"] };
const CLOSED_FILTER = { $in: ["Won", "Lost"] };

/**
 * Count leads that are still open (not Won/Lost) for a user.
 */
export async function countActiveLeads(userId) {
  return Lead.countDocuments({ owner: userId, stage: ACTIVE_FILTER });
}

/**
 * Compute a composite performance score for a salesperson.
 *
 * Metric breakdown:
 *   avgCompletionMs  – average time from creation → close (lower is better)
 *   closedCount      – total leads closed          (higher is better)
 *   score            = closedCount / (avgCompletionMs + 1)
 *
 * Returns { avgCompletionMs, closedCount, performanceScore }
 */
export async function computePerformanceScore(userId) {
  const closed = await Lead.find(
    { owner: userId, stage: CLOSED_FILTER },
    "createdAt updatedAt"
  ).lean();

  const closedCount = closed.length;
  if (closedCount === 0) {
    return { avgCompletionMs: Infinity, closedCount: 0, performanceScore: 0 };
  }

  const totalMs = closed.reduce(
    (sum, l) => sum + (new Date(l.updatedAt) - new Date(l.createdAt)),
    0
  );
  const avgCompletionMs = totalMs / closedCount;

  // Higher score = faster + more closures
  const performanceScore = closedCount / (avgCompletionMs + 1);

  return { avgCompletionMs, closedCount, performanceScore };
}

/* ────────────── core assignment ────────────── */

/**
 * Build the full ranked candidate list.
 *
 * Each candidate:
 *   { userId, name, email, activeLeads, closedCount, avgCompletionMs, performanceScore }
 *
 * Sorted by: activeLeads ASC → performanceScore DESC
 */
export async function getAssignmentCandidates() {
  const salesUsers = await User.find(
    { role: "sales", isActive: true },
    "_id name email"
  ).lean();

  if (!salesUsers.length) return [];

  const candidates = await Promise.all(
    salesUsers.map(async (u) => {
      const activeLeads = await countActiveLeads(u._id);
      const perf = await computePerformanceScore(u._id);
      return {
        userId: u._id,
        name: u.name,
        email: u.email,
        activeLeads,
        ...perf,
      };
    })
  );

  // Sort: fewest active first, then highest performance first
  candidates.sort((a, b) => {
    if (a.activeLeads !== b.activeLeads) return a.activeLeads - b.activeLeads;
    return b.performanceScore - a.performanceScore;
  });

  return candidates;
}

/**
 * Pick the best assignee using the two-tier rule:
 *   1. Sales member with fewest active leads
 *   2. Tie-break by highest performance score
 *
 * Returns { suggested: { userId, name, ... }, candidates: [...] }
 *         or { suggested: null, candidates: [] } when no sales members exist.
 */
export async function suggestAssignee() {
  const candidates = await getAssignmentCandidates();
  if (!candidates.length) return { suggested: null, candidates };
  return { suggested: candidates[0], candidates };
}

/**
 * Persist cached performance fields on User document.
 * Called after leads are closed/moved so dashboards stay fresh.
 */
export async function refreshUserPerformance(userId) {
  if (!userId) return;
  const perf = await computePerformanceScore(userId);
  await User.findByIdAndUpdate(userId, {
    avgCompletionMs: perf.avgCompletionMs === Infinity ? 0 : perf.avgCompletionMs,
    closedLeadCount: perf.closedCount,
    performanceScore: perf.performanceScore,
  });
}
