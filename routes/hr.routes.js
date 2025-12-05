const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  authorizePermission,
} = require("../middleware/auth.middleware");

// Endpoint 1: View Own Profile (Least Privilege)
// Protected by authenticateToken only.
router.get("/profile/self", authenticateToken, (req, res) => {
  res.json({
    message: "Access granted: View Own Profile",
    user: req.user,
  });
});

// Endpoint 2: View All Employee Data (HR/Admin Privilege)
// Protected by authenticateToken, then by authorizePermission(['employee:view_all', 'admin:full_access']).
router.get(
  "/employees",
  authenticateToken,
  authorizePermission(["employee:view_all", "admin:full_access"]),
  (req, res) => {
    res.json({
      message: "Access granted: View All Employee Data",
      data: [
        { id: 1, name: "John Doe", role: "Employee" },
        { id: 2, name: "Jane Smith", role: "Manager" },
      ],
    });
  }
);

// Endpoint 3: Create New User (Admin Privilege)
// Protected by authenticateToken, then by authorizePermission(['admin:full_access', 'hr:user_onboard']).
router.post(
  "/users",
  authenticateToken,
  authorizePermission(["admin:full_access", "hr:user_onboard"]),
  (req, res) => {
    res.status(201).json({
      message: "Access granted: Create New User",
      createdUser: req.body,
    });
  }
);

module.exports = router;
