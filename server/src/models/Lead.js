import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    leadId: { type: String, unique: true },
    leadType: {
      type: String,
      enum: ["CHS", "Hotel", "Corporate", "Developer", "Other"],
      required: true,
    },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    area: { type: String, required: true },
    locality: { type: String },
    propertySizeFlats: { type: Number },
    parkingType: { type: String, enum: ["open", "basement", "mixed"], default: "open" },
    currentEvCount: { type: Number },
    chargerInterest: [{ type: String }],
    notes: { type: String },
    consent: { type: Boolean, default: false },
    stage: {
      type: String,
      enum: ["New", "Qualified", "Meeting Booked", "Proposal Sent", "Won", "Lost"],
      default: "New",
    },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    leadScore: { type: Number, default: 0 },
    nextFollowUpDate: { type: Date },
    decisionMakerKnown: { type: Boolean, default: false },
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

leadSchema.index({ phone: 1, email: 1 });

const Lead = mongoose.model("Lead", leadSchema);

export default Lead;

