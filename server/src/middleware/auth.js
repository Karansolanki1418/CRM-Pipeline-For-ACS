import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "devsecret");
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = { id: user._id, role: user.role, name: user.name };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const requireRole = (roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

