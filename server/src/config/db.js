import mongoose from "mongoose";

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI not set");
  }
  try {
    await mongoose.connect(uri, {
      dbName: process.env.MONGO_DB_NAME || "acs_leads",
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error", err);
    throw err;
  }
};

export default connectDB;

