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

module.exports = router;
