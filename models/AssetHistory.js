const mongoose = require("mongoose");

const assetHistorySchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: true,
    },
    action: {
      type: String,
      enum: [
        "Created",
        "Updated",
        "Assigned",
        "Acknowledged",
        "Returned",
        "Damaged",
        "Repaired",
        "Disposed",
        "Deleted",
      ],
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      default: Date.now,
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
assetHistorySchema.index({ assetId: 1, timestamp: -1 });
assetHistorySchema.index({ tenantId: 1 });

module.exports = mongoose.model("AssetHistory", assetHistorySchema);
