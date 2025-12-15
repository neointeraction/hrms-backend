const express = require("express");
const router = express.Router();
const superadminController = require("../controllers/superadmin.controller");
const { requireSuperAdmin } = require("../middleware/superadmin.middleware");
const authMiddleware = require("../middleware/auth.middleware");
const multer = require("multer");
const path = require("path");

// Multer Config
const cloudinary = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Cloudinary Storage Config
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "hrms/tenants/branding",
    format: async (req, file) => {
      const ext = path.extname(file.originalname).substring(1);
      return ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpeg";
    },
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      return file.fieldname + "-" + uniqueSuffix;
    },
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
