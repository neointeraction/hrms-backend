const mongoose = require("mongoose");

const assetAssignmentSchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    issueDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expectedReturnDate: {
      type: Date,
    },
    actualReturnDate: {
      type: Date,
    },
    conditionAtIssue: {
      type: String,
      enum: ["New", "Good", "Used", "Damaged"],
    },
    conditionAtReturn: {
      type: String,
      enum: ["New", "Good", "Used", "Damaged"],
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    acknowledgedAt: {
      type: Date,
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    returnApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    returnApprovedAt: {
      type: Date,
    },
    notes: {
      type: String,
    },
    status: {
      type: String,
      enum: ["Pending Acknowledgement", "Active", "Returned"],
      default: "Pending Acknowledgement",
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
assetAssignmentSchema.index({ assetId: 1, status: 1 });
assetAssignmentSchema.index({ employeeId: 1, status: 1 });
assetAssignmentSchema.index({ tenantId: 1 });

module.exports = mongoose.model("AssetAssignment", assetAssignmentSchema);
