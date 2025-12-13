const express = require("express");
const router = express.Router();
const assetController = require("../controllers/asset.controller");
const {
  authenticateToken,
  authorize,
} = require("../middleware/auth.middleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for invoice uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/assets/invoices");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only images and PDF files are allowed"));
    }
  },
});

// All routes require authentication
router.use(authenticateToken);

// Get asset statistics
router.get("/stats", authorize(["admin", "hr"]), assetController.getAssetStats);

// Create asset (admin/hr only)
router.post("/", authorize(["admin", "hr"]), assetController.createAsset);

// Get all assets (with filters)
router.get("/", assetController.getAssets);

// Get single asset
router.get("/:id", assetController.getAssetById);

// Update asset (admin/hr only)
router.put("/:id", authorize(["admin", "hr"]), assetController.updateAsset);

// Delete asset (admin/hr only)
router.delete("/:id", authorize(["admin", "hr"]), assetController.deleteAsset);

// Dispose asset (permanent write-off, admin/hr only)
router.post(
  "/:id/dispose",
  authorize(["admin", "hr"]),
  assetController.disposeAsset
);

// Upload invoice
router.post(
  "/:id/upload-invoice",
  authorize(["admin", "hr"]),
  upload.single("invoice"),
  async (req, res) => {
    try {
      const Asset = require("../models/Asset");
      const asset = await Asset.findOne({
        _id: req.params.id,
        tenantId: req.user.tenantId,
      });

      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      asset.invoice = `/uploads/assets/invoices/${req.file.filename}`;
      await asset.save();

      res.json({
        message: "Invoice uploaded successfully",
        invoicePath: asset.invoice,
      });
    } catch (error) {
      console.error("Upload invoice error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

module.exports = router;
