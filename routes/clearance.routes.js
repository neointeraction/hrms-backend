const express = require("express");
const router = express.Router();
const {
  getClearance,
  updateClearanceItem,
} = require("../controllers/clearance.controller");
const {
  authenticateToken,
  authorize,
} = require("../middleware/auth.middleware");

// Get Clearance for a specific resignation
// Resignation ID is passed, logic will find or create the clearance record
router.get(
  "/resignation/:resignationId",
  authenticateToken,
  authorize(["Admin", "HR", "Project Manager"]),
  getClearance
);

// Update specific item (Asset or Task) status
router.patch(
  "/:id/item",
  authenticateToken,
  authorize(["Admin", "HR"]),
  updateClearanceItem
);

module.exports = router;
