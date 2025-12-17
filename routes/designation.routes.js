const express = require("express");
const router = express.Router();
const designationController = require("../controllers/designation.controller");
const {
  authenticateToken,
  authorize,
} = require("../middleware/auth.middleware");

// All routes require authentication
router.use(authenticateToken);

// Get all designations (Accessible by employees to view, or at least Admin/HR)
// For dropdowns, generally all logged in users might need it, or at least common roles.
// But for management, restricted.
// Let's restrict Viewing to everyone (for profile display) or at least Employees.
// For now, let's keep it simple: Authenticated.
router.get("/", designationController.getDesignations);

// Management routes - Protected for Admin/HR
router.post(
  "/",
  authorize(["Admin", "HR", "Super Admin"]),
  designationController.createDesignation
);
router.put(
  "/:id",
  authorize(["Admin", "HR", "Super Admin"]),
  designationController.updateDesignation
);
router.delete(
  "/:id",
  authorize(["Admin", "HR", "Super Admin"]),
  designationController.deleteDesignation
);

module.exports = router;
