import express from "express";
import Lead from "../models/Lead.js";
import Activity from "../models/Activity.js";
import Followup from "../models/Followup.js";
import User from "../models/User.js";
import computeLeadScore from "../utils/leadScoring.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { suggestAssignee, refreshUserPerformance } from "../services/assignmentService.js";
import mongoose from "mongoose";

const router = express.Router();

function checkLeadAccess(req, lead) {
  if (req.user.role === "admin") return true;
  if (!lead.owner) return false;
  return lead.owner.toString() === req.user.id.toString();
}

router.post("/public", async (req, res) => {
  try {
    const data = req.body;
    const chargerInterest = Array.isArray(data.chargerInterest)
      ? data.chargerInterest
      : data.chargerInterest
        ? [data.chargerInterest]
        : [];

    let duplicateOf = null;
    if (data.phone || data.email) {
      const existing = await Lead.findOne({
        $or: [
          data.phone ? { phone: data.phone } : null,
          data.email ? { email: data.email } : null,
        ].filter(Boolean),
      });
      if (existing) {
        duplicateOf = existing._id;
      }
    }

    // Use manual owner if provided, otherwise auto-assign
    let assignedOwner;
    if (data.owner) {
      // Manual override — validate that the user exists and is a salesperson
      const manualUser = await User.findById(data.owner);
      if (manualUser && manualUser.role === "sales" && manualUser.isActive) {
        assignedOwner = manualUser._id;
      } else {
        // Fallback to auto-assign if invalid manual selection
        const result = await suggestAssignee();
        assignedOwner = result.suggested?.userId || undefined;
      }
    } else {
      const result = await suggestAssignee();
      assignedOwner = result.suggested?.userId || undefined;
    }

    const leadObjectId = new mongoose.Types.ObjectId();
    const nowTs = Date.now();
    const lead = new Lead({
      _id: leadObjectId,
      leadId: `ACS-${String(nowTs).slice(-6)}-${leadObjectId.toString().slice(-4)}`,
      leadType: data.leadType,
      name: data.name,
      phone: data.phone,
      email: data.email,
      area: data.area,
      locality: data.locality,
      propertySizeFlats: data.propertySizeFlats,
      parkingType: data.parkingType,
      currentEvCount: data.currentEvCount,
      chargerInterest,
      notes: data.notes,
      consent: !!data.consent,
      decisionMakerKnown: !!data.decisionMakerKnown,
      duplicateOf,
      owner: assignedOwner,
    });

    lead.leadScore = computeLeadScore(lead);
    await lead.save();

    const ownerUser = assignedOwner
      ? await User.findById(assignedOwner, "name")
      : null;

    res.status(201).json({
      leadId: lead.leadId,
      id: lead._id,
      duplicate: !!duplicateOf,
      assignedTo: ownerUser ? ownerUser.name : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create lead" });
  }
});

router.use(authMiddleware);

/* ─── Admin: get suggested assignee + candidate list ─── */
router.get("/suggest-assignee", requireRole(["admin"]), async (req, res) => {
  try {
    const result = await suggestAssignee();
    res.json(result);
  } catch (err) {
    console.error("suggest-assignee error:", err);
    res.status(500).json({ message: "Failed to compute assignment suggestion" });
  }
});

/* ─── Admin: reassign a lead to a different salesperson ─── */
router.put("/:id/reassign", requireRole(["admin"]), async (req, res) => {
  try {
    const { newOwner } = req.body;
    if (!newOwner) {
      return res.status(400).json({ message: "newOwner is required" });
    }
    const targetUser = await User.findById(newOwner);
    if (!targetUser || targetUser.role !== "sales" || !targetUser.isActive) {
      return res.status(400).json({ message: "Invalid sales user" });
    }
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const oldOwner = lead.owner;
    const oldOwnerUser = oldOwner ? await User.findById(oldOwner, "name") : null;

    lead.owner = targetUser._id;
    lead.updatedBy = req.user.id;
    await lead.save();

    // Log the reassignment as an activity
    await Activity.create({
      lead: lead._id,
      user: req.user.id,
      type: "note",
      subject: `Reassigned: ${oldOwnerUser?.name || "Unassigned"} → ${targetUser.name}`,
      description: `Lead reassigned from ${oldOwnerUser?.name || "unassigned"} to ${targetUser.name} by admin`,
      createdBy: req.user.id,
    });

    // Refresh performance metrics for both old and new owners
    if (oldOwner) await refreshUserPerformance(oldOwner);
    await refreshUserPerformance(targetUser._id);

    res.json({
      message: "Lead reassigned",
      lead: { _id: lead._id, owner: { _id: targetUser._id, name: targetUser.name } },
    });
  } catch (err) {
    console.error("reassign error:", err);
    res.status(500).json({ message: "Failed to reassign lead" });
  }
});
router.get("/", async (req, res) => {
  const {
    q,
    area,
    leadType,
    stage,
    owner,
    fromDate,
    toDate,
    limit = 500,
  } = req.query;

  const filter = {};
  if (req.user.role === "sales") {
    filter.owner = req.user.id;
  } else {
    if (owner) filter.owner = owner;
  }
  if (area) filter.area = new RegExp(area, "i");
  if (leadType) filter.leadType = leadType;
  if (stage) filter.stage = stage;
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);
  }
  if (q) {
    filter.$or = [
      { name: new RegExp(q, "i") },
      { phone: new RegExp(q, "i") },
      { email: new RegExp(q, "i") },
      { area: new RegExp(q, "i") },
      { locality: new RegExp(q, "i") },
    ];
  }

  const leads = await Lead.find(filter)
    .populate("owner", "name email")
    .sort({ createdAt: -1 })
    .limit(Number(limit));

  res.json(leads);
});

router.get("/export/csv/all", async (req, res) => {
  const { owner, stage, fromDate, toDate } = req.query;
  const filter = {};
  if (req.user.role === "sales") {
    filter.owner = req.user.id;
  } else {
    if (owner) filter.owner = owner;
  }
  if (stage) filter.stage = stage;
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);
  }
  const leads = await Lead.find(filter).populate("owner", "name");
  const fields = [
    "leadId",
    "leadType",
    "name",
    "phone",
    "email",
    "area",
    "locality",
    "propertySizeFlats",
    "parkingType",
    "currentEvCount",
    "chargerInterest",
    "stage",
    "leadScore",
    "ownerName",
    "createdAt",
  ];

  const escapeCsv = (value) => {
    if (value === null || value === undefined) return "";
    const str = String(value).replace(/\r?\n/g, " ");
    if (/[",]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = fields.join(",");
  const rows = leads.map((l) => {
    const obj = l.toObject();
    obj.chargerInterest = (obj.chargerInterest || []).join("|");
    obj.ownerName = l.owner?.name || "";
    return fields.map((f) => escapeCsv(obj[f])).join(",");
  });

  const csv = [header, ...rows].join("\n");
  res.header("Content-Type", "text/csv");
  res.attachment("acs-leads.csv");
  return res.send(csv);
});

router.get("/:id", async (req, res) => {
  const lead = await Lead.findById(req.params.id).populate(
    "owner",
    "name email"
  );
  if (!lead) return res.status(404).json({ message: "Lead not found" });
  if (!checkLeadAccess(req, lead))
    return res.status(403).json({ message: "Forbidden" });

  const activities = await Activity.find({ lead: lead._id })
    .populate("user", "name role")
    .sort({ createdAt: -1 });
  const followups = await Followup.find({ lead: lead._id }).sort({
    dueDate: 1,
  });

  res.json({ lead, activities, followups });
});

async function updateSalesAchieved(userId) {
  if (!userId) return;
  const wonCount = await Lead.countDocuments({ owner: userId, stage: "Won" });
  const user = await User.findById(userId);
  if (user) {
    user.salesAchieved = wonCount;
    user.incentiveEligible =
      user.salesTarget > 0 && wonCount >= user.salesTarget;
    await user.save();
  }
  // Also refresh composite performance metrics
  await refreshUserPerformance(userId);
}

router.put("/:id", async (req, res) => {
  const updates = { ...req.body, updatedBy: req.user.id };
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ message: "Lead not found" });
  if (!checkLeadAccess(req, lead))
    return res.status(403).json({ message: "Forbidden" });

  const oldStage = lead.stage;
  const oldOwner = lead.owner;
  Object.assign(lead, updates);
  lead.leadScore = computeLeadScore(lead);
  await lead.save();

  if (oldStage !== lead.stage) {
    await Activity.create({
      lead: lead._id,
      user: req.user.id,
      type: "note",
      subject: `Stage: ${oldStage} → ${lead.stage}`,
      description:
        req.body.stageNote ||
        `Lead moved from ${oldStage} to ${lead.stage}`,
      createdBy: req.user.id,
    });
  }

  if (
    oldStage !== lead.stage ||
    (oldOwner &&
      oldOwner.toString() !== (lead.owner || "").toString())
  ) {
    await updateSalesAchieved(lead.owner);
    if (
      oldOwner &&
      oldOwner.toString() !== (lead.owner || "").toString()
    ) {
      await updateSalesAchieved(oldOwner);
    }
  }

  res.json(lead);
});

router.post("/:id/activities", async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ message: "Lead not found" });
  if (!checkLeadAccess(req, lead))
    return res.status(403).json({ message: "Forbidden" });

  const activity = await Activity.create({
    lead: lead._id,
    user: req.user.id,
    type: req.body.type,
    subject: req.body.subject || "",
    description: req.body.description,
    attachmentUrl: req.body.attachmentUrl,
    createdBy: req.user.id,
  });

  res.status(201).json(activity);
});

router.post("/:id/followups", async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ message: "Lead not found" });
  if (!checkLeadAccess(req, lead))
    return res.status(403).json({ message: "Forbidden" });

  const followup = await Followup.create({
    lead: lead._id,
    user: req.user.id,
    dueDate: req.body.dueDate,
    status: "pending",
    notes: req.body.notes,
    createdBy: req.user.id,
  });

  lead.nextFollowUpDate = req.body.dueDate;
  await lead.save();

  res.status(201).json(followup);
});

router.delete("/:id", async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ message: "Lead not found" });
  if (!checkLeadAccess(req, lead))
    return res.status(403).json({ message: "Forbidden" });

  const ownerId = lead.owner;
  await Activity.deleteMany({ lead: lead._id });
  await Followup.deleteMany({ lead: lead._id });
  await lead.deleteOne();

  if (ownerId) {
    await updateSalesAchieved(ownerId);
  }

  res.json({ message: "Lead and related records deleted" });
});

export default router;
