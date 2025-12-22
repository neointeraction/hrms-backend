const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employee.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { extractTenant } = require("../middleware/tenant.middleware");
const multer = require("multer");
const path = require("path");

// Multer Config
const fs = require("fs");

// Local Disk Storage Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "uploads/employees";
    if (req.user && req.user.tenantId) {
      uploadPath = `uploads/tenants/${req.user.tenantId}/employees`;
    }
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({ storage: storage });

const { authorizePermission } = require("../middleware/auth.middleware");

// Apply authentication and tenant middleware
router.use(authMiddleware.authenticateToken);
router.use(extractTenant);

router.post(
  "/",
  authorizePermission(["employees:create"]),
  upload.single("profilePicture"),
  employeeController.createEmployee
);
// Hierarchy route MUST be before /:id (view permission usually enough)
router.get(
  "/hierarchy",
  authorizePermission(["employees:view", "organization:view"]),
  employeeController.getHierarchy
);
router.get(
  "/upcoming-events",
  authorizePermission(["employees:view"]),
  employeeController.getUpcomingEvents
);
router.get(
  "/:id/timeline",
  authorizePermission(["employees:view", "my_journey:view"]),
  employeeController.getEmployeeTimeline
);
router.get(
  "/",
  authorizePermission(["employees:view"]),
  employeeController.getEmployees
);
router.get("/me", employeeController.getEmployeeProfile);
router.get(
  "/:id",
  authorizePermission(["employees:view"]),
  employeeController.getEmployeeById
);
router.put(
  "/:id",
  authorizePermission(["employees:edit"]),
  upload.single("profilePicture"),
  employeeController.updateEmployee
);

module.exports = router;
