import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();

const app = express();

app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({ message: "ACS Energy CRM API is running" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("DB connection failed", err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});

app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/users", userRoutes);

try {
  const swaggerPath = path.join(process.cwd(), "swagger.json");
  if (fs.existsSync(swaggerPath)) {
    const swaggerDoc = JSON.parse(fs.readFileSync(swaggerPath));
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));
  }
} catch (err) {
  console.warn("Swagger docs not loaded:", err.message);
}

export const startServer = async () => {
  await connectDB();
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
};

export default app;

