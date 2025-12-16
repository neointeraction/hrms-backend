const express = require("express");
const router = express.Router();
const documentTypeController = require("../controllers/documentType.controller");
const employeeDocumentController = require("../controllers/employeeDocument.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { extractTenant } = require("../middleware/tenant.middleware");
const multer = require("multer");
const path = require("path");

const fs = require("fs");

// Local Disk Storage Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "uploads/documents";
    if (req.user && req.user.tenantId) {
      uploadPath = `uploads/tenants/${req.user.tenantId}/documents`;
    }

    // Ensure directory exists
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const name = path.parse(file.originalname).name.replace(/\s+/g, "-"); // Sanitize
    const ext = path.extname(file.originalname);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Optional: Add file type validation if needed, essentially replacing allowed_formats
    // For now allowing all as we accept diverse docs but could restrict if needed
    cb(null, true);
  },
});

router.use(authMiddleware.authenticateToken);
router.use(extractTenant);

// --- Document Type Routes ---
router.post("/types", documentTypeController.createDocumentType);
router.get("/types", documentTypeController.getAllDocumentTypes);
router.get("/types/:id", documentTypeController.getDocumentTypeById);
router.put("/types/:id", documentTypeController.updateDocumentType);
router.delete("/types/:id", documentTypeController.deleteDocumentType);

// --- Employee Document Routes ---
router.post(
  "/employee/upload",
  upload.single("file"), // Expects form-data field 'file'
  employeeDocumentController.uploadDocument
);
router.get(
  "/employee/:employeeId",
  employeeDocumentController.getEmployeeDocuments
);
router.get("/employee/doc/:id", employeeDocumentController.getDocumentById);
router.post(
  "/employee/restore/:id/:versionNumber",
  employeeDocumentController.restoreVersion
);

module.exports = router;
