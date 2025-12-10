const express = require("express");
const router = express.Router();
const auditController = require("../controllers/audit.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

// All routes require authentication
router.use(authenticateToken);

// Get audit logs with filters
router.get("/", auditController.getAuditLogs);

// Get audit logs for specific entity
router.get("/:entityType/:entityId", auditController.getEntityAuditLogs);

// Clear audit logs
router.delete("/", auditController.clearAuditLogs);

// Delete single audit log
router.delete("/:id", auditController.deleteAuditLog);

module.exports = router;
