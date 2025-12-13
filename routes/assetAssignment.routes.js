const express = require("express");
const router = express.Router();
const assignmentController = require("../controllers/assetAssignment.controller");
const {
  authenticateToken,
  authorize,
} = require("../middleware/auth.middleware");

// All routes require authentication
router.use(authenticateToken);

// Assign asset to employee (admin/hr only)
router.post(
  "/assign",
  authorize(["admin", "hr"]),
  assignmentController.assignAsset
);

// Acknowledge asset receipt (employee)
router.post("/:id/acknowledge", assignmentController.acknowledgeAsset);

// Return asset
router.post("/:id/return", assignmentController.returnAsset);

// Get employee's assets
router.get("/employee/:employeeId?", assignmentController.getEmployeeAssets);

// Get pending acknowledgements (admin/hr only)
router.get(
  "/pending-acknowledgements",
  authorize(["admin", "hr"]),
  assignmentController.getPendingAcknowledgements
);

// Get all assignments (admin/hr only)
router.get(
  "/",
  authorize(["admin", "hr"]),
  assignmentController.getAssignments
);

module.exports = router;
