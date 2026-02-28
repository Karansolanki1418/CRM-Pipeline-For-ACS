import express from "express";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import Lead from "../models/Lead.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/me", async (req, res) => {
  const user = await User.findById(req.user.id, "-passwordHash");
  if (!user) return res.status(404).json({ message: "User not found" });
  const assignedLeads = await Lead.countDocuments({ owner: user._id });
  const wonLeads = await Lead.countDocuments({ owner: user._id, stage: "Won" });
  const pendingLeads = await Lead.countDocuments({ owner: user._id, stage: { $nin: ["Won", "Lost"] } });
  res.json({
    ...user.toObject(),
    assignedLeads,
    wonLeads,
    pendingLeads,
    incentiveEligible: user.salesTarget > 0 && wonLeads >= user.salesTarget,
  });
});

router.use(requireRole(["admin"]));

router.get("/", async (req, res) => {
  const users = await User.find({}, "-passwordHash").sort({ createdAt: -1 });
  res.json(users);
});

router.get("/performance", async (req, res) => {
  const salesUsers = await User.find({ role: "sales" }, "-passwordHash").sort({ createdAt: -1 });
  const result = [];
  for (const user of salesUsers) {
    const assignedLeads = await Lead.countDocuments({ owner: user._id });
    const wonLeads = await Lead.countDocuments({ owner: user._id, stage: "Won" });
    const pendingLeads = await Lead.countDocuments({ owner: user._id, stage: { $nin: ["Won", "Lost"] } });
    const incentiveEligible = user.salesTarget > 0 && wonLeads >= user.salesTarget;
    if (user.incentiveEligible !== incentiveEligible || user.salesAchieved !== wonLeads) {
      user.salesAchieved = wonLeads;
      user.incentiveEligible = incentiveEligible;
      await user.save();
    }
    result.push({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      salesTarget: user.salesTarget || 0,
      salesAchieved: wonLeads,
      incentiveEligible,
      assignedLeads,
      pendingLeads,
    });
  }
  res.json(result);
});

router.post("/", async (req, res) => {
  const { name, email, phone, role = "sales", password } = req.body;
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: "Name, email and password are required" });
  }
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: "User with this email already exists" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    phone,
    role,
    passwordHash,
  });
  res.status(201).json({
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
  });
});

router.put("/:id", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (req.body.salesTarget !== undefined) {
    user.salesTarget = Number(req.body.salesTarget);
  }
  if (req.body.isActive !== undefined) {
    user.isActive = req.body.isActive;
  }
  await user.save();
  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    salesTarget: user.salesTarget,
    isActive: user.isActive,
  });
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  if (req.user.id === id) {
    return res.status(400).json({ message: "You cannot remove your own account" });
  }
  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  if (user.role === "admin") {
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount <= 1) {
      return res.status(400).json({ message: "At least one admin must remain" });
    }
  }
  await user.deleteOne();
  res.json({ message: "User removed" });
});

export default router;
