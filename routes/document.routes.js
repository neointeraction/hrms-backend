const express = require("express");
const router = express.Router();
const documentTypeController = require("../controllers/documentType.controller");
const employeeDocumentController = require("../controllers/employeeDocument.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { extractTenant } = require("../middleware/tenant.middleware");
const { upload } = require("../config/upload"); // Unified Cloudinary/Disk Middleware

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
  employeeDocumentController.uploadDocument,
);
router.get(
  "/employee/:employeeId",
  employeeDocumentController.getEmployeeDocuments,
);
router.get("/employee/doc/:id", employeeDocumentController.getDocumentById);
router.post(
  "/employee/restore/:id/:versionNumber",
  employeeDocumentController.restoreVersion,
);

module.exports = router;
