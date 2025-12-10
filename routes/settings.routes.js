const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settings.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { extractTenant } = require("../middleware/tenant.middleware");
const {
  requireCompanyAdmin,
} = require("../middleware/companyAdmin.middleware");

// All routes require authentication and tenant context
router.use(authMiddleware.authenticateToken);
router.use(extractTenant);

// Company Settings (Company Admin only for updates)
router.get("/company", settingsController.getCompanySettings);
router.put(
  "/company",
  requireCompanyAdmin,
  settingsController.updateCompanySettings
);

// Subscription & Usage (All authenticated users can view)
router.get("/subscription", settingsController.getSubscriptionDetails);
router.get("/usage", settingsController.getUsageAnalytics);

// Plan Management (Company Admin only)
router.post(
  "/upgrade-plan",
  requireCompanyAdmin,
  settingsController.upgradePlan
);

module.exports = router;
