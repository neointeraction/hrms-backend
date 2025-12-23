const express = require("express");
const router = express.Router();
const auditController = require("../controllers/audit.controller");
const {
  authenticateToken,
  authorizePermission,
} = require("../middleware/auth.middleware");

// All routes require authentication
router.use(authenticateToken);

// Get audit logs with filters
router.get(
  "/",
  authorizePermission(["audit:view"]),
  auditController.getAuditLogs
);

// Get audit logs for specific entity
router.get(
  "/:entityType/:entityId",
  authorizePermission(["audit:view"]),
  auditController.getEntityAuditLogs
);

// Clear audit logs
router.delete(
  "/",
  authorizePermission(["audit:clear"]),
  auditController.clearAuditLogs
);

// Delete single audit log
router.delete(
  "/:id",
  authorizePermission(["audit:delete"]),
  auditController.deleteAuditLog
);

module.exports = router;
