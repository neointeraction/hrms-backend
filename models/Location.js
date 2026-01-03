const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    isHeadquarters: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound index for unique location names within a tenant
locationSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Location", locationSchema);
