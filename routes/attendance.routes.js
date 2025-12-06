const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendance.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

// All routes require authentication
router.use(authenticateToken);

// Clock in/out
router.post("/clock-in", attendanceController.clockIn);
router.post("/clock-out", attendanceController.clockOut);

// Break management
router.post("/break-start", attendanceController.startBreak);
router.post("/break-end", attendanceController.endBreak);

// Status and history
router.get("/status", attendanceController.getStatus);
router.get("/history", attendanceController.getHistory);
router.get("/team-status", attendanceController.getTeamStatus);

module.exports = router;
