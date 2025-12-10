const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employee.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { extractTenant } = require("../middleware/tenant.middleware");
const multer = require("multer");
const path = require("path");

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    // Unique name: timestamp-basename(orig)-ext
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
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
