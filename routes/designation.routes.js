const express = require("express");
const router = express.Router();
const designationController = require("../controllers/designation.controller");
const {
  authenticateToken,
  authorizePermission,
} = require("../middleware/auth.middleware");

// All routes require authentication
router.use(authenticateToken);

// Get all designations - Protected by "designations:view"
router.get(
  "/",
  authorizePermission("designations:view"),
  designationController.getDesignations
);

// Get designation stats - Protected by "designations:view"
router.get(
  "/stats",
  authorizePermission("designations:view"),
  designationController.getDesignationStats
);

// Management routes - Protected by "designations:manage"
router.post(
  "/",
  authorizePermission("designations:manage"),
  designationController.createDesignation
);
router.put(
  "/:id",
  authorizePermission("designations:manage"),
  designationController.updateDesignation
);
router.delete(
  "/:id",
  authorizePermission("designations:manage"),
  designationController.deleteDesignation
);

module.exports = router;
