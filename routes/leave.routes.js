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

// Reject Leave
router.put("/:id/reject", leaveController.rejectLeave);

module.exports = router;
