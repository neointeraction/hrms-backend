const express = require("express");
const router = express.Router();
const timeCorrectionController = require("../controllers/timeCorrection.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

// All routes require authentication
router.use(authenticateToken);

// Correction requests
router.post("/request", timeCorrectionController.requestCorrection);
router.get("/my-requests", timeCorrectionController.getMyCorrections);
router.get("/pending", timeCorrectionController.getPendingCorrections);

// Approval/rejection
router.put("/:id/approve", timeCorrectionController.approveCorrection);
router.put("/:id/reject", timeCorrectionController.rejectCorrection);

module.exports = router;
