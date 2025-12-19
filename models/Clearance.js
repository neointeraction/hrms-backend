const mongoose = require("mongoose");

const clearanceSchema = new mongoose.Schema(
  {
    resignation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resignation",
      required: true,
      unique: true,
    },
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
    // Assets assigned to the employee at the time of resignation
    assetsToReturn: [
      {
        assetAssignment: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "AssetAssignment",
        },
        assetName: String, // Snapshot
        assetCode: String, // Snapshot
        status: {
          type: String,
          enum: ["Pending", "Returned", "Lost", "Damaged"],
          default: "Pending",
        },
        returnedDate: Date,
        remarks: String,
      },
    ],
    // Generic tasks (e.g., KT, Access revocation)
    checklist: [
      {
        task: String,
        department: {
          type: String,
          enum: ["HR", "IT", "Finance", "Admin", "Manager"],
          default: "HR",
        },
        status: {
          type: String,
          enum: ["Pending", "Completed", "Waived"],
          default: "Pending",
        },
        completedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        completedAt: Date,
        remarks: String,
      },
    ],
    overallStatus: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
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

clearanceSchema.index({ employee: 1 });

module.exports = mongoose.model("Clearance", clearanceSchema);
