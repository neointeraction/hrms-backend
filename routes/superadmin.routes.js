const express = require("express");
const router = express.Router();
const superadminController = require("../controllers/superadmin.controller");
const { requireSuperAdmin } = require("../middleware/superadmin.middleware");
const authMiddleware = require("../middleware/auth.middleware");

// All routes require Super Admin access
router.use(authMiddleware.authenticateToken);
router.use(requireSuperAdmin);

// Tenant Management
router.get("/tenants", superadminController.getAllTenants);
router.get("/tenants/:id", superadminController.getTenantById);
router.post("/tenants", superadminController.createTenant);
router.patch("/tenants/:id", superadminController.updateTenant);
router.patch("/tenants/:id/status", superadminController.updateTenantStatus);
router.delete("/tenants/:id", superadminController.deleteTenant);

// Tenant Actions
router.post(
  "/tenants/:id/reset-admin-password",
  superadminController.resetAdminPassword
);

// Analytics
router.get("/analytics/overview", superadminController.getPlatformAnalytics);
router.get("/analytics/tenants/:id/usage", superadminController.getTenantUsage);

module.exports = router;
