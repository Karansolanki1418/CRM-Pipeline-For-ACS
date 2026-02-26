import express from "express";
import Lead from "../models/Lead.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/summary", async (req, res) => {
  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);

  const matchBase = {};
  if (req.user.role === "sales") {
    matchBase.owner = req.user.id;
  }

  const newLeadsThisWeek = await Lead.countDocuments({
    ...matchBase,
    createdAt: { $gte: startOfWeek },
  });

  const stageAgg = await Lead.aggregate([
    { $match: matchBase },
    { $group: { _id: "$stage", count: { $sum: 1 } } },
  ]);

  const newToMeetingAgg = await Lead.aggregate([
    { $match: { ...matchBase, stage: { $in: ["New", "Meeting Booked"] } } },
    {
      $group: {
        _id: "$stage",
        count: { $sum: 1 },
      },
    },
  ]);

  const counts = Object.fromEntries(stageAgg.map((s) => [s._id, s.count]));

  const newCount = counts["New"] || 0;
  const meetingCount = counts["Meeting Booked"] || 0;
  const conversionNewToMeeting =
    newCount === 0 ? 0 : Math.round((meetingCount / newCount) * 100);

  const topLocalitiesAgg = await Lead.aggregate([
    { $match: matchBase },
    {
      $group: {
        _id: { area: "$area", locality: "$locality" },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  res.json({
    newLeadsThisWeek,
    stageCounts: counts,
    conversionNewToMeeting,
    topLocalities: topLocalitiesAgg.map((t) => ({
      area: t._id.area,
      locality: t._id.locality,
      count: t.count,
    })),
    rawNewToMeetingAgg: newToMeetingAgg,
  });
});

export default router;

