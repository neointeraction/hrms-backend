const express = require("express");
const router = express.Router();
const badgeController = require("../controllers/badge.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { extractTenant } = require("../middleware/tenant.middleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/badges";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "badge-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed"));
    }
  },
});

router.use(authMiddleware.authenticateToken);
router.use(extractTenant);

// Public (authenticated) routes
router.get("/", badgeController.getBadges);

// Admin/HR only routes
router.post(
  "/",
  authMiddleware.authorize(["admin", "hr"]),
  upload.single("icon"),
  badgeController.createBadge
);

router.delete(
  "/:id",
  authMiddleware.authorize(["admin", "hr"]),
  badgeController.deleteBadge
);

router.put(
  "/:id",
  authMiddleware.authorize(["admin", "hr"]),
  upload.single("icon"),
  badgeController.updateBadge
);

module.exports = router;
