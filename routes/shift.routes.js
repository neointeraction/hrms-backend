const express = require("express");
const router = express.Router();
const shiftController = require("../controllers/shift.controller");
const {
  authenticateToken,
  authorize,
} = require("../middleware/auth.middleware");

// All routes require authentication
router.use(authenticateToken);

// Management routes - Protected for Admin/HR
router.get(
  "/",
  authorize(["Admin", "HR", "Super Admin"]),
  shiftController.getShifts
);

router.post(
  "/",
  authorize(["Admin", "HR", "Super Admin"]),
  shiftController.createShift
);

router.put(
  "/:id",
  authorize(["Admin", "HR", "Super Admin"]),
  shiftController.updateShift
);

router.delete(
  "/:id",
  authorize(["Admin", "HR", "Super Admin"]),
  shiftController.deleteShift
);

module.exports = router;
