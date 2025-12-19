const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
const {
  authenticateToken,
  authorize,
} = require("../middleware/auth.middleware");

// CEO Stats
// Protected by Auth and Role Check (CEO only)
// Note: We need to ensure 'CEO' is in the allowed roles list if roleCheck enforces specific strings,
// or allow "CEO" to pass if it's dynamic.
router.get(
  "/ceo-stats",
  authenticateToken,
  authorize(["CEO", "Super Admin"]), // Allow Super Admin for debugging
  dashboardController.getCEOStats
);

module.exports = router;
