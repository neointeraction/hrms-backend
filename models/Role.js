const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    // Required for tenant-specific roles, null for platform roles (e.g., Super Admin)
  },
  permissions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Permission",
    },
  ],
  accessibleModules: [String],
  mandatoryDocuments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocumentType",
    },
  ],
});

// Compound index: role names unique per tenant
roleSchema.index({ tenantId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Role", roleSchema);
