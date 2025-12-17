const mongoose = require("mongoose");

const shiftSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: String, // Format: "HH:mm" (24-hour)
      required: true,
    },
    endTime: {
      type: String, // Format: "HH:mm" (24-hour)
      required: true,
    },
    breakDuration: {
      type: Number, // in minutes
      default: 0,
    },
    gracePeriod: {
      type: Number, // in minutes
      default: 0,
    },
    workingDays: {
      type: [String], // Array of days, e.g., ["Monday", "Tuesday", ...]
      default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique shift names within a tenant
shiftSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Shift", shiftSchema);
