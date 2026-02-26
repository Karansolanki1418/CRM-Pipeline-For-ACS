import express from "express";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole(["admin"]));


router.get("/", async (req, res) => {
  const users = await User.find({}, "-passwordHash").sort({ createdAt: -1 });
  res.json(users);
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

