const AuditLog = require("../models/AuditLog");

/**
 * Create an audit log entry
 * @param {String} entityType - Type of entity (TimeEntry, Timesheet, TimeCorrection)
 * @param {ObjectId} entityId - ID of the entity
 * @param {String} action - Action performed (create, update, delete, approve, reject, submit)
 * @param {ObjectId} performedBy - User ID who performed the action
 * @param {ObjectId} employee - Employee ID (optional)
 * @param {Object} changes - Object containing old and new values
 * @param {Object} metadata - Additional context
 * @param {String} ipAddress - IP address (optional)
 */
async function createAuditLog({
  entityType,
  entityId,
  action,
  performedBy,
  employee = null,
  changes = {},
  metadata = {},
  ipAddress = null,
}) {
  try {
    const auditLog = new AuditLog({
      entityType,
      entityId,
      action,
      performedBy,
      employee,
      changes,
      metadata,
      ipAddress,
    });

    await auditLog.save();
    return auditLog;
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw - audit logging shouldn't break main operations
  }
}

/**
 * Get audit logs with filters
 */
async function getAuditLogs(filters = {}) {
  const query = {};

  if (filters.entityType) query.entityType = filters.entityType;
  if (filters.entityId) query.entityId = filters.entityId;
  if (filters.action) query.action = filters.action;
  if (filters.employee) query.employee = filters.employee;
  if (filters.performedBy) query.performedBy = filters.performedBy;

  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
  }

  const logs = await AuditLog.find(query)
    .populate("performedBy", "name email")
    .populate("employee", "firstName lastName employeeId")
    .sort({ createdAt: -1 })
    .limit(filters.limit || 100);

  return logs;
}

module.exports = {
  createAuditLog,
  getAuditLogs,
};
