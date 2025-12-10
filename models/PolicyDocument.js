const mongoose = require("mongoose");

const PolicyDocumentSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    textContent: {
      type: String,
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.PolicyDocument ||
  mongoose.model("PolicyDocument", PolicyDocumentSchema);
