const express = require("express");
const router = express.Router();
const leaveController = require("../controllers/leave.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

// All routes require authentication
router.use(authenticateToken);

// Apply for Leave
router.post("/apply", leaveController.applyLeave);

// Get My Leaves
router.get("/my-leaves", leaveController.getMyLeaves);

// Get Pending Approvals (Manager/HR)
router.get("/pending-approvals", leaveController.getPendingApprovals);

// Approve Leave
router.put("/:id/approve", leaveController.approveLeave);

// Get Employees Currently on Leave
router.get("/active", leaveController.getEmployeesOnLeave);

// Get Leave Stats
router.get("/stats", leaveController.getLeaveStats);

// HR Overview (Place before :id routes to avoid conflict if any)
const { authorize } = require("../middleware/auth.middleware");
router.get(
  "/hr-overview",
  authorize(["HR", "Admin"]),
  leaveController.getHRLeaveOverview
);

// Reject Leave
router.put("/:id/reject", leaveController.rejectLeave);

module.exports = router;
