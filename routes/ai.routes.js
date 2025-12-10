const express = require("express");
const router = express.Router();
const aiController = require("../controllers/ai.controller");
const {
  authenticateToken: auth,
  authorize,
} = require("../middleware/auth.middleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Configure Multer
const uploadDir = "uploads/policies";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed!"), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Admin/HR Routes
router.post(
  "/upload-policy",
  auth,
  authorize(["Admin", "HR"]),
  upload.single("policyFile"),
  aiController.uploadPolicy
);

// Get Policy Status (Admin access mainly, but useful for UI state)
router.get("/policy-status", auth, aiController.getPolicyStatus);

// Chat Route (All users)
router.post("/chat", auth, aiController.askQuestion);

module.exports = router;
