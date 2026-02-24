const mongoose = require("mongoose");

const approvalSchema = new mongoose.Schema({
  approver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  role: { type: String, required: true }, // 'Project Manager' or 'HR'
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  comments: String,
  date: { type: Date, default: Date.now },
});

const leaveSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ["Sick", "Casual", "Paid", "Unpaid", "Floating"],
      required: true,
    },
    isHalfDay: {
      type: Boolean,
      default: false,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Cancelled"],
      default: "Pending",
    },
    workflowStatus: {
      type: String,
      default: "Pending Approval", // 'Pending PM', 'Pending HR', 'Approved', 'Rejected'
    },
    approvals: [approvalSchema],
    totalDays: { type: Number, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Leave || mongoose.model("Leave", leaveSchema);
