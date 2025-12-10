const express = require("express");
const router = express.Router();
const holidayController = require("../controllers/holiday.controller");
const {
  authenticateToken: protect,
  authorizePermission: authorize,
} = require("../middleware/auth.middleware");

// Public (authenticated) - View all
router.get("/", protect, holidayController.getHolidays);

// Admin/HR Only - Manage
router.post(
  "/",
  protect,
  authorize("admin", "hr"),
  holidayController.addHoliday
);
router.put(
  "/:id",
  protect,
  authorize("admin", "hr"),
  holidayController.updateHoliday
);
router.delete(
  "/:id",
  protect,
  authorize("admin", "hr"),
  holidayController.deleteHoliday
);

// Seed Route (Admin only)
router.post(
  "/seed",
  protect,
  authorize("admin"),
  holidayController.seedHolidays
);

module.exports = router;
