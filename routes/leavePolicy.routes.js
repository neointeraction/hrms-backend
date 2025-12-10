const express = require("express");
const router = express.Router();
const leavePolicyController = require("../controllers/leavePolicy.controller");
const {
  authenticateToken,
  authorize,
} = require("../middleware/auth.middleware");

// Protect routes -> Only Admin and HR can manage policies
// 'Admin' and 'HR' roles (checking both cases to be safe)
router.post(
  "/",
  authenticateToken,
  authorize(["Admin", "HR", "admin", "hr"]),
  leavePolicyController.createPolicy
);
router.get(
  "/",
  authenticateToken,
  authorize([
    "Admin",
    "HR",
    "Project Manager",
    "Employee",
    "admin",
    "hr",
    "manager",
    "employee",
  ]),
  leavePolicyController.getPolicies
); // Employees might need to see available policies? Or maybe just backend uses it.
router.get(
  "/:id",
  authenticateToken,
  authorize(["Admin", "HR", "admin", "hr"]),
  leavePolicyController.getPolicyById
);
router.put(
  "/:id",
  authenticateToken,
  authorize(["Admin", "HR", "admin", "hr"]),
  leavePolicyController.updatePolicy
);
router.delete(
  "/:id",
  authenticateToken,
  authorize(["Admin", "HR", "admin", "hr"]),
  leavePolicyController.deletePolicy
);

module.exports = router;
