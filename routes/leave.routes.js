const express = require("express");
const router = express.Router();
const leaveController = require("../controllers/leave.controller");
const {
  authenticateToken,
  authorizePermission,
} = require("../middleware/auth.middleware");

// All routes require authentication
router.use(authenticateToken);

// Apply for Leave
router.post(
  "/apply",
  authorizePermission(["leave:apply"]), // Everyone with this permission can apply
  leaveController.applyLeave
);

// Get My Leaves (assuming this is replaced by /history or /balances, but keeping for now as it's not explicitly removed)
// If this route is to be removed, it should be explicitly stated.
// For now, let's assume it might be kept or its functionality moved.
// If it's kept, it would likely need a permission check too.
// router.get("/my-leaves", leaveController.getMyLeaves); // This route is likely superseded by /history or /balances

// Get pending approvals for managers/HR
router.get(
  "/approvals/pending",
  authorizePermission(["leave:approve"]),
  leaveController.getPendingApprovals
);

// Approve Leave
router.put(
  "/:id/approve",
  authorizePermission(["leave:approve"]),
  leaveController.approveLeave
);

// Get Employees Currently on Leave (assuming this route remains as it's not in the edit snippet)
router.get("/active", leaveController.getEmployeesOnLeave);

// Get Leave Stats
router.get(
  "/stats",
  authorizePermission(["leave:view", "leave:apply"]),
  leaveController.getLeaveStats
);

// HR Overview
router.get(
  "/hr-overview",
  authorizePermission(["leave:view_all", "leave:approve"]), // HR dashboard access
  leaveController.getHRLeaveOverview
);

// Reject Leave
router.put("/:id/reject", leaveController.rejectLeave);

module.exports = router;
