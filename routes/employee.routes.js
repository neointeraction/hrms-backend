const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employee.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { extractTenant } = require("../middleware/tenant.middleware");
const multer = require("multer");
const path = require("path");

// Multer Config
const cloudinary = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Cloudinary Storage Config
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "hrms/employees", // Keep it simple or use function
    format: async (req, file) => {
      // computed format
      const ext = path.extname(file.originalname).substring(1);
      return ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpeg";
    },
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      return file.fieldname + "-" + uniqueSuffix;
    },
    // Use a function for folder to support multi-tenancy organization if desired
    folder: (req, file) => {
      if (req.user && req.user.tenantId) {
        return `hrms/tenants/${req.user.tenantId}/employees`;
      }
      return `hrms/employees`;
    },
  },
});

const upload = multer({ storage: storage });

// Apply authentication and tenant middleware
router.use(authMiddleware.authenticateToken);
router.use(extractTenant);

router.post(
  "/",
  upload.single("profilePicture"),
  employeeController.createEmployee
);
// Hierarchy route MUST be before /:id to avoid conflict if :id is generic (though here it is okay, better safe)
router.get("/hierarchy", employeeController.getHierarchy);
router.get("/upcoming-events", employeeController.getUpcomingEvents);
router.get("/", employeeController.getEmployees);
router.get("/:id", employeeController.getEmployeeById);
router.put(
  "/:id",
  upload.single("profilePicture"),
  employeeController.updateEmployee
);

module.exports = router;
