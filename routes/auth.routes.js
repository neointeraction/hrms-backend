const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.put("/reset-password/:resetToken", authController.resetPassword);
router.get("/me", authenticateToken, authController.getMe);
router.put("/me", authenticateToken, authController.updateProfile);
router.post(
  "/acknowledge-welcome",
  authenticateToken,
  authController.acknowledgeWelcome
);

module.exports = router;
