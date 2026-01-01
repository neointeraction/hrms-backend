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

// Configure Multer for PDF uploads
const isServerless =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION;
const uploadDir = isServerless ? "/tmp" : "uploads/policies";

if (!isServerless && !fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
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
  upload.array("policyFiles", 10),
  aiController.uploadPolicy
);

router.delete(
  "/policy/:id",
  auth,
  authorize(["Admin", "HR"]),
  aiController.deletePolicy
);

// Get Policy Status (Admin access mainly, but useful for UI state)
router.get("/policy-status", auth, aiController.getPolicyStatus);

// Chat Route (All users)
router.post("/chat", auth, aiController.askQuestion);

// Agent Route (Admin/HR only)
router.post(
  "/agent",
  auth,
  authorize(["Admin", "HR"]),
  aiController.executeAgent
);

module.exports = router;
