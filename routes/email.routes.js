const express = require("express");
const router = express.Router();
const emailController = require("../controllers/email.controller");
// console.log("DEBUG: emailController exports:", emailController);
const {
  authenticateToken: protect,
  authorize,
} = require("../middleware/auth.middleware");

// All routes protected and mostly for HR/Admin
router.get(
  "/settings",
  protect,
  authorize(["admin", "hr"]),
  emailController.getSettings
);
router.put(
  "/settings",
  protect,
  authorize(["admin", "hr"]),
  emailController.updateSettings
);
router.post(
  "/trigger",
  protect,
  authorize(["admin", "hr"]),
  emailController.triggerManual
);
router.get(
  "/audit-logs",
  protect,
  authorize(["admin", "hr"]),
  emailController.getAuditLogs
);

module.exports = router;
