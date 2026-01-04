const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const {
  authenticateToken,
  authorizePermission,
} = require("../middleware/auth.middleware");
const { extractTenant } = require("../middleware/tenant.middleware");

// Apply authentication and tenant middleware to all routes
router.use(authenticateToken);
router.use(extractTenant);

// User Management (Protected by Employee permissions as they are linked)
router.get(
  "/users",
  authorizePermission(["employees:view"]),
  adminController.getUsers
);
router.delete(
  "/users/:id",
  authorizePermission(["employees:delete"]),
  adminController.deleteUser
);
router.patch(
  "/users/:id/status",
  authorizePermission(["employees:edit"]),
  adminController.updateUserStatus
);

// Role Routes (Protected by Role permissions)
router.get(
  "/roles",
  authorizePermission(["roles:view"]),
  adminController.getRoles
);
router.post(
  "/roles",
  authorizePermission(["roles:create"]),
  adminController.createRole
);
router.put(
  "/roles/:id",
  authorizePermission(["roles:edit"]),
  adminController.updateRole
);
router.delete(
  "/roles/:id",
  authorizePermission(["roles:delete"]),
  adminController.deleteRole
);
router.get("/permissions", adminController.getPermissions); // Permissions list is public to authenticated users (or restrict to roles:view)

// System Health (Admin Only)
router.get(
  "/system-health",
  authorizePermission(["roles:view"]), // Re-using an admin-level permission
  adminController.getSystemHealth
);

module.exports = router;
