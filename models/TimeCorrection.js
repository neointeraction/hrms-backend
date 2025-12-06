const mongoose = require("mongoose");

const timeCorrectionSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    timeEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TimeEntry",
    },
    correctionType: {
      type: String,
      enum: ["add", "edit", "delete"],
      required: true,
    },
    requestedDate: {
      type: Date,
      required: true,
    },
    requestedClockIn: Date,
    requestedClockOut: Date,
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: Date,
    managerComments: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("TimeCorrection", timeCorrectionSchema);
