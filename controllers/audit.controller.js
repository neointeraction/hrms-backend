const AuditLog = require("../models/AuditLog");
const { getAuditLogs } = require("../utils/auditLogger");

// Get Audit Logs (Admin/HR only)
exports.getAuditLogs = async (req, res) => {
  try {
    const filters = {
      entityType: req.query.entityType,
      action: req.query.action,
      employee: req.query.employee,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: parseInt(req.query.limit) || 100,
    };

    const logs = await getAuditLogs(filters);

    res.json({ logs });
  } catch (error) {
    console.error("Get audit logs error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Audit Logs for specific entity
exports.getEntityAuditLogs = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const logs = await AuditLog.find({
      entityType,
      entityId,
    })
      .populate("performedBy", "name email")
      .populate("employee", "firstName lastName employeeId")
      .sort({ createdAt: -1 });

    res.json({ logs });
  } catch (error) {
    console.error("Get entity audit logs error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Clear Audit Logs (Admin only)
exports.clearAuditLogs = async (req, res) => {
  try {
    // Ideally check if user is Admin, but route should be protected
    await AuditLog.deleteMany({});
    res.json({ message: "Audit logs cleared successfully" });
  } catch (error) {
    console.error("Clear audit logs error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete single audit log
exports.deleteAuditLog = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await AuditLog.findByIdAndDelete(id);

    if (!log) {
      return res.status(404).json({ message: "Audit log not found" });
    }

    res.json({ message: "Audit log deleted successfully" });
  } catch (error) {
    console.error("Delete audit log error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
