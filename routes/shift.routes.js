const express = require("express");
const router = express.Router();
const shiftController = require("../controllers/shift.controller");
const {
  authenticateToken,
  authorizePermission,
} = require("../middleware/auth.middleware");

// All routes require authentication
router.use(authenticateToken);

// Management routes - Protected by permissions
router.get(
  "/",
  authorizePermission(["shifts:view", "shifts:manage"]),
  shiftController.getShifts,
);

router.post(
  "/",
  authorizePermission(["shifts:manage"]),
  shiftController.createShift,
);

router.put(
  "/:id",
  authorizePermission(["shifts:manage"]),
  shiftController.updateShift,
);

router.delete(
  "/:id",
  authorizePermission(["shifts:manage"]),
  shiftController.deleteShift,
);

router.post(
  "/:id/assign",
  authorizePermission(["shifts:manage"]),
  shiftController.assignEmployees,
);

router.post(
  "/:id/remove",
  authorizePermission(["shifts:manage"]),
  shiftController.removeEmployees,
);

module.exports = router;
