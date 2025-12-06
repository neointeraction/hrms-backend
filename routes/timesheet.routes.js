const express = require("express");
const router = express.Router();
const timesheetController = require("../controllers/timesheet.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

// All routes require authentication
router.use(authenticateToken);

// Timesheet CRUD
router.post("/entry", timesheetController.createEntry);
router.get("/entries", timesheetController.getEntries);
router.put("/entry/:id", timesheetController.updateEntry);
router.delete("/entry/:id", timesheetController.deleteEntry);

// Approval workflow
router.post("/submit", timesheetController.submitTimesheets);
router.get("/pending-approvals", timesheetController.getPendingApprovals);
router.put("/:id/approve", timesheetController.approveTimesheet);
router.put("/:id/reject", timesheetController.rejectTimesheet);

module.exports = router;
