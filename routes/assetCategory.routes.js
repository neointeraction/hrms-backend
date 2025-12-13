const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/assetCategory.controller");
const {
  authenticateToken,
  authorize,
} = require("../middleware/auth.middleware");

// All routes require authentication
router.use(authenticateToken);

// Create category (admin/hr only)
router.post("/", authorize(["admin", "hr"]), categoryController.createCategory);

// Get all categories
router.get("/", categoryController.getCategories);

// Get single category
router.get("/:id", categoryController.getCategoryById);

// Update category (admin/hr only)
router.put(
  "/:id",
  authorize(["admin", "hr"]),
  categoryController.updateCategory
);

// Delete category (admin/hr only)
router.delete(
  "/:id",
  authorize(["admin", "hr"]),
  categoryController.deleteCategory
);

// Toggle category status (admin/hr only)
router.patch(
  "/:id/toggle-status",
  authorize(["admin", "hr"]),
  categoryController.toggleCategoryStatus
);

module.exports = router;
