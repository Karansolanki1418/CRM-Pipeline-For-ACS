import mongoose from "mongoose";

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI not set");
  }
  try {
    await mongoose.connect(uri, {
      dbName: process.env.MONGO_DB_NAME || "acs_leads",
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error", err);
    process.exit(1);
  }
};

export default connectDB;

