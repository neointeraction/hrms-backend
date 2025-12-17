const mongoose = require("mongoose");

const designationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
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

// Compound index to ensure unique designation names within a tenant
designationSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Designation", designationSchema);
