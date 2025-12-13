const express = require("express");
const router = express.Router();
const incidentController = require("../controllers/assetIncident.controller");
const {
  authenticateToken,
  authorize,
} = require("../middleware/auth.middleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/assets/incidents");
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// All routes require authentication
router.use(authenticateToken);

// Report incident (with photo upload)
router.post(
  "/report",
  upload.array("photos", 5), // Max 5 photos
  incidentController.reportIncident
);

// Get all incidents (admin/hr only)
router.get("/", authorize(["admin", "hr"]), incidentController.getIncidents);

// Get single incident
router.get("/:id", incidentController.getIncidentById);

// Update incident (admin/hr only)
router.put(
  "/:id",
  authorize(["admin", "hr"]),
  incidentController.updateIncident
);

// Resolve incident (admin/hr only)
router.post(
  "/:id/resolve",
  authorize(["admin", "hr"]),
  incidentController.resolveIncident
);

module.exports = router;
