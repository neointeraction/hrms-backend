const express = require("express");
const router = express.Router();
const {
  submitResignation,
  getMyResignation,
  getPendingResignations,
  updateResignationStatus,
} = require("../controllers/resignation.controller");
const {
  authenticateToken,
  authorize,
} = require("../middleware/auth.middleware");

// Employee Routes
router.post("/", authenticateToken, submitResignation);
router.get("/me", authenticateToken, getMyResignation);

// Admin/HR/Manager Routes
// Assuming 'hr' and 'admin' roles can manage resignations
router.get(
  "/pending",
  authenticateToken,
  authorize(["Admin", "HR", "Project Manager"]),
  getPendingResignations
);
router.patch(
  "/:id/status",
  authenticateToken,
  authorize(["Admin", "HR", "Project Manager"]),
  updateResignationStatus
);

module.exports = router;
