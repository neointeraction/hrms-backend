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

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");

// Configure Multer for temp storage
const uploadDir = path.join(os.tmpdir(), "hrms-uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

// Company Settings (Company Admin only for updates)
router.get("/company", settingsController.getCompanySettings);
router.put(
  "/company",
  requireCompanyAdmin,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
  ]),
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
