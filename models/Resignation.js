const mongoose = require("mongoose");

const ResignationSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    submittedDate: {
      type: Date,
      default: Date.now,
    },
    lastWorkingDay: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "withdrawn", "completed"],
      default: "pending",
    },
    comments: {
      type: String,
    },
    history: [
      {
        action: String,
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        date: { type: Date, default: Date.now },
        comment: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Resignation", ResignationSchema);
