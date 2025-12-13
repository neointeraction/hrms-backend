const mongoose = require("mongoose");

const customFieldSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    fieldType: {
      type: String,
      enum: ["text", "number", "date", "dropdown", "boolean"],
      required: true,
    },
    required: {
      type: Boolean,
      default: false,
    },
    options: [String], // For dropdown field type
  },
  { _id: false }
);

const assetCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    customFields: [customFieldSchema],
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: name must be unique per tenant
assetCategorySchema.index({ name: 1, tenantId: 1 }, { unique: true });

module.exports = mongoose.model("AssetCategory", assetCategorySchema);
