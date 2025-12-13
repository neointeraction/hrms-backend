const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema(
  {
    assetCode: {
      type: String,
      unique: true,
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssetCategory",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    manufacturer: {
      type: String,
      trim: true,
    },
    model: {
      type: String,
      trim: true,
    },
    serialNumber: {
      type: String,
      trim: true,
    },
    purchaseDate: {
      type: Date,
    },
    vendor: {
      type: String,
      trim: true,
    },
    warrantyExpiry: {
      type: Date,
    },
    condition: {
      type: String,
      enum: ["New", "Good", "Used", "Damaged"],
      default: "New",
    },
    status: {
      type: String,
      enum: ["Available", "Issued", "Under Repair", "Lost", "Disposed"],
      default: "Available",
    },
    purchasePrice: {
      type: Number,
      min: 0,
    },
    currentValue: {
      type: Number,
      min: 0,
    },
    invoice: {
      type: String, // File path
    },
    customFieldValues: {
      type: mongoose.Schema.Types.Mixed, // Dynamic object based on category
    },
    notes: {
      type: String,
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
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate asset code before validation
assetSchema.pre("validate", async function (next) {
  if (!this.isNew || this.assetCode) return next();

  try {
    // Find the latest asset for this tenant
    const latestAsset = await this.constructor
      .findOne({ tenantId: this.tenantId })
      .sort({ createdAt: -1 })
      .select("assetCode");

    let nextNumber = 1;
    if (latestAsset && latestAsset.assetCode) {
      // Extract number from code (e.g., AST-0001 -> 1)
      const match = latestAsset.assetCode.match(/AST-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    // Generate new code with leading zeros (e.g., AST-0001)
    this.assetCode = `AST-${String(nextNumber).padStart(4, "0")}`;
    next();
  } catch (error) {
    next(error);
  }
});

// Index for faster queries
assetSchema.index({ tenantId: 1, status: 1 });
assetSchema.index({ tenantId: 1, categoryId: 1 });

module.exports = mongoose.model("Asset", assetSchema);
