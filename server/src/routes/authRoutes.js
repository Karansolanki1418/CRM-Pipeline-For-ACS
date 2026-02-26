import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const match = await user.comparePassword(password);
  if (!match) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET || "devsecret",
    { expiresIn: "7d" }
  );
  res.json({
    token,
    user: { id: user._id, name: user.name, role: user.role, email: user.email },
  });
});

router.post("/seed-admin", async (req, res) => {
  const existing = await User.findOne({ role: "admin" });
  if (existing) {
    return res.json({ message: "Admin already exists", admin: { email: existing.email } });
  }
  const password = req.body.password || "admin123";
  const hash = await bcrypt.hash(password, 10);
  const admin = await User.create({
    name: "ACS Admin",
    email: "admin@acs.local",
    passwordHash: hash,
    role: "admin",
  });
  res.json({
    message: "Admin created",
    admin: { email: admin.email },
  });
});

export default router;

