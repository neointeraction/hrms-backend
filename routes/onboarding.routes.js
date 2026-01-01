const express = require("express");
const router = express.Router();
const onboardingController = require("../controllers/onboarding.controller");
const {
  authenticateToken,
  authorize,
} = require("../middleware/auth.middleware");

// HR Routes (Protected)
router.post(
  "/invite",
  authenticateToken,
  authorize(["Admin", "HR"]),
  onboardingController.inviteEmployee
);

const upload = require("../middleware/upload.middleware");

// Public Routes (Employee Access via Token)
router.get("/validate/:token", onboardingController.validateToken);
router.post("/save/:token", onboardingController.saveOnboardingStep);
router.post(
  "/upload/:token",
  upload.single("file"),
  onboardingController.uploadDocument
);

const { extractTenant } = require("../middleware/tenant.middleware");
const limitsMiddleware = require("../middleware/limits.middleware");

// HR Routes for Approval (Protected)
router.post(
  "/approve/:employeeId",
  authenticateToken,
  extractTenant, // Explicitly extract tenant context
  authorize(["Admin", "HR"]),
  limitsMiddleware.checkEmployeeLimit,
  onboardingController.approveEmployee
);

router.post(
  "/reject/:employeeId",
  authenticateToken,
  extractTenant, // Explicitly extract tenant context
  authorize(["Admin", "HR"]),
  onboardingController.rejectEmployee
);

module.exports = router;
