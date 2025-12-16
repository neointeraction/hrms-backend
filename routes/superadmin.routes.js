const express = require("express");
const router = express.Router();
const superadminController = require("../controllers/superadmin.controller");
const { requireSuperAdmin } = require("../middleware/superadmin.middleware");
const authMiddleware = require("../middleware/auth.middleware");
const multer = require("multer");
const path = require("path");

// Multer Config
const fs = require("fs");

// Local Disk Storage Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/tenants/logos"; // Central place for initial logos or tenant specific?
    // Tenant ID might not be available during creation if it's new.
    // Usually logo is uploaded during tenant creation or update.
    // If update, we might have ID.
    // Let's stick to a generic folder for now or check params.
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `logo-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({ storage: storage });

// All routes require Super Admin access
router.use(authMiddleware.authenticateToken);
router.use(requireSuperAdmin);

// Tenant Management
router.get("/tenants", superadminController.getAllTenants);
router.get("/users", superadminController.getAllUsers);
router.patch("/users/:id/status", superadminController.updateUserStatus); // New route
router.delete("/users/:id", superadminController.deleteUser); // New route
router.get("/tenants/:id", superadminController.getTenantById);
router.post(
  "/tenants",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
  ]),
  superadminController.createTenant
);
router.patch(
  "/tenants/:id",
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
  ]),
  superadminController.updateTenant
);
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
