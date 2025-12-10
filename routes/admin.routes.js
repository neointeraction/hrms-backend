const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const { authenticateToken } = require("../middleware/auth.middleware");
const { extractTenant } = require("../middleware/tenant.middleware");

// Apply authentication and tenant middleware to all routes
router.use(authenticateToken);
router.use(extractTenant);

// For now, public or just simple route to unblock 404
router.get("/users", adminController.getUsers);
router.delete("/users/:id", adminController.deleteUser);
router.patch("/users/:id/status", adminController.updateUserStatus);

// Role Routes
router.get("/roles", adminController.getRoles);
router.post("/roles", adminController.createRole);
router.put("/roles/:id", adminController.updateRole);
router.delete("/roles/:id", adminController.deleteRole);
router.get("/permissions", adminController.getPermissions);

module.exports = router;
