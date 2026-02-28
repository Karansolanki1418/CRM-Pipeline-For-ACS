import express from "express";
import Lead from "../models/Lead.js";
import Activity from "../models/Activity.js";
import Followup from "../models/Followup.js";
import User from "../models/User.js";
import computeLeadScore from "../utils/leadScoring.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

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

    const lead = new Lead({
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
      owner: data.owner || undefined,
    });

    lead.leadScore = computeLeadScore(lead);
    await lead.save();
    lead.leadId = `ACS-${String(lead.createdAt.getTime()).slice(-6)}-${lead._id
      .toString()
      .slice(-4)}`;
    await lead.save();

    res.status(201).json({
      leadId: lead.leadId,
      id: lead._id,
      duplicate: !!duplicateOf,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create lead" });
  }
});

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const {
    q,
    area,
    leadType,
    stage,
    owner,
    fromDate,
    toDate,
    limit = 50,
  } = req.query;

  const filter = {};
  if (area) filter.area = new RegExp(area, "i");
  if (leadType) filter.leadType = leadType;
  if (stage) filter.stage = stage;
  if (owner) filter.owner = owner;
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

router.get("/:id", async (req, res) => {
  const lead = await Lead.findById(req.params.id).populate("owner", "name email");
  if (!lead) return res.status(404).json({ message: "Lead not found" });

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
    user.incentiveEligible = user.salesTarget > 0 && wonCount >= user.salesTarget;
    await user.save();
  }
}

router.put("/:id", async (req, res) => {
  const updates = { ...req.body, updatedBy: req.user.id };
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ message: "Lead not found" });

  const oldStage = lead.stage;
  const oldOwner = lead.owner;
  Object.assign(lead, updates);
  lead.leadScore = computeLeadScore(lead);
  await lead.save();

  if (oldStage !== lead.stage || (oldOwner && oldOwner.toString() !== (lead.owner || "").toString())) {
    await updateSalesAchieved(lead.owner);
    if (oldOwner && oldOwner.toString() !== (lead.owner || "").toString()) {
      await updateSalesAchieved(oldOwner);
    }
  }

  res.json(lead);
});

router.post("/:id/activities", async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ message: "Lead not found" });

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

  const ownerId = lead.owner;
  await Activity.deleteMany({ lead: lead._id });
  await Followup.deleteMany({ lead: lead._id });
  await lead.deleteOne();

  if (ownerId) {
    await updateSalesAchieved(ownerId);
  }

  res.json({ message: "Lead and related records deleted" });
});

router.get("/export/csv/all", async (req, res) => {
  const leads = await Lead.find({});
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
    return fields.map((f) => escapeCsv(obj[f])).join(",");
  });

  const csv = [header, ...rows].join("\n");
  res.header("Content-Type", "text/csv");
  res.attachment("acs-leads.csv");
  return res.send(csv);
});

export default router;
