const mongoose = require("mongoose");

const DocumentTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String, // e.g., "Employment", "Identity", "Legal"
      required: true,
      default: "General",
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    description: {
      type: String,
    },
    isRequired: {
      type: Boolean,
      default: false,
    },
    expiryRequired: {
      type: Boolean,
      default: false,
    },
    allowedFileTypes: {
      type: [String], // e.g., ["application/pdf", "image/jpeg", "image/png"]
      default: ["application/pdf", "image/jpeg", "image/png"],
    },
    maxFileSize: {
      type: Number, // in bytes, e.g., 5 * 1024 * 1024 for 5MB
      default: 5242880, // 5MB
    },
    // Optional: Roles this document is applicable to (if we want to filter per role here)
    // For now, keeping it simple as per request, logic can be in settings or distinct model
    applicableRoles: [{ type: String }],

    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Compound index to ensure unique document names within a tenant
DocumentTypeSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports =
  mongoose.models.DocumentType ||
  mongoose.model("DocumentType", DocumentTypeSchema);
