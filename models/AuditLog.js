const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      required: true,
      enum: ["TimeEntry", "Timesheet", "TimeCorrection", "User"],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "create",
        "update",
        "delete",
        "approve",
        "reject",
        "submit",
        "login",
        "logout",
      ],
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    changes: {
      type: mongoose.Schema.Types.Mixed, // Flexible object for old/new values
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // Additional context
    },
    ipAddress: String,
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: false, // Optional for system-level actions
    },
  },
  { timestamps: true }
);

// Index for faster queries
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ performedBy: 1 });
auditLogSchema.index({ employee: 1 });
auditLogSchema.index({ tenantId: 1 }); // Index for tenant filtering
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
