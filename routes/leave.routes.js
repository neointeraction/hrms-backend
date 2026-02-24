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
  leaveController.applyLeave,
);

// Get My Leaves
router.get(
  "/my-leaves",
  authorizePermission(["leave:view"]), // Require view permission
  leaveController.getMyLeaves,
);

// Update Pending Leave
router.put(
  "/:id",
  authorizePermission(["leave:apply"]),
  leaveController.updateLeave,
);

// Cancel Pending Leave
router.put(
  "/:id/cancel",
  authorizePermission(["leave:apply"]),
  leaveController.cancelLeave,
);

// Get pending approvals for managers/HR
router.get(
  "/pending-approvals",
  authorizePermission(["leave:approve"]),
  leaveController.getPendingApprovals,
);

// Approve Leave
router.put(
  "/:id/approve",
  authorizePermission(["leave:approve"]),
  leaveController.approveLeave,
);

// Get Employees Currently on Leave (assuming this route remains as it's not in the edit snippet)
router.get("/active", leaveController.getEmployeesOnLeave);

// Get Leave Stats
router.get(
  "/stats",
  authorizePermission(["leave:view", "leave:apply"]),
  leaveController.getLeaveStats,
);

// HR Overview
router.get(
  "/hr-overview",
  authorizePermission(["leave:view_all", "leave:approve"]), // HR dashboard access
  leaveController.getHRLeaveOverview,
);

// Reject Leave
router.put(
  "/:id/reject",
  authorizePermission(["leave:approve"]),
  leaveController.rejectLeave,
);

module.exports = router;
