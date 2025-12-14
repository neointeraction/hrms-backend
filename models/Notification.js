const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    type: {
      type: String,
      enum: ["LEAVE", "TIMESHEET", "PAYROLL", "SYSTEM", "MENTION", "REACTION"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      // Dynamic ref based on type could be complex, keeping it as generic ID for now
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Notification ||
  mongoose.model("Notification", notificationSchema);
