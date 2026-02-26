import mongoose from "mongoose";

const followupSchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "skipped"],
      default: "pending",
    },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const Followup = mongoose.model("Followup", followupSchema);

export default Followup;

