const express = require("express");
const router = express.Router();
const historyController = require("../controllers/assetHistory.controller");
const {
  authenticateToken,
  authorize,
} = require("../middleware/auth.middleware");

// All routes require authentication
router.use(authenticateToken);

// Get history for specific asset
router.get("/asset/:assetId", historyController.getAssetHistory);

// Get all history logs (admin/hr only - for audit)
router.get("/", authorize(["admin", "hr"]), historyController.getAllHistory);

module.exports = router;
