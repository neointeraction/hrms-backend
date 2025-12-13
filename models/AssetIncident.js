const mongoose = require("mongoose");

const assetIncidentSchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssetAssignment",
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    incidentType: {
      type: String,
      enum: ["Damage", "Lost", "Theft", "Malfunction"],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    incidentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    photos: [String], // Array of file paths
    urgency: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Reported", "Under Investigation", "Resolved", "Closed"],
      default: "Reported",
    },
    resolution: {
      type: String,
    },
    repairCost: {
      type: Number,
      min: 0,
    },
    repairVendor: {
      type: String,
    },
    employeeChargeAmount: {
      type: Number,
      min: 0,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    resolvedAt: {
      type: Date,
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
assetIncidentSchema.index({ assetId: 1, status: 1 });
assetIncidentSchema.index({ reportedBy: 1 });
assetIncidentSchema.index({ tenantId: 1 });

module.exports = mongoose.model("AssetIncident", assetIncidentSchema);
