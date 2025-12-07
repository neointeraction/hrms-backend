const express = require("express");
const router = express.Router();
const employeeController = require("../controllers/employee.controller");
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

// router.use(authenticateToken); // Uncomment when ready

router.post(
  "/",
  upload.single("profilePicture"),
  employeeController.createEmployee
);
router.get("/", employeeController.getEmployees);
router.get("/:id", employeeController.getEmployeeById);
router.put(
  "/:id",
  upload.single("profilePicture"),
  employeeController.updateEmployee
);

module.exports = router;
