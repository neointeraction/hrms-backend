const mongoose = require("mongoose");

const EmailAuditSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
      },
    },
    type: {
      type: String,
      enum: ["Birthday", "Anniversary", "TimesheetReminder"],
      required: true,
    },
    subject: { type: String, required: true },
    bodySnapshot: { type: String }, // Store a copy of what was sent
    sentAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["Success", "Failed"],
      required: true,
    },
    error: { type: String },
    triggeredBy: {
      type: String,
      enum: ["System", "HR Manual"], // 'System' for cron, 'HR Manual' for button click
      default: "System",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmailAudit", EmailAuditSchema);
