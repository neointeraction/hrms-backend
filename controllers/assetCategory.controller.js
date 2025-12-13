const AssetCategory = require("../models/AssetCategory");

// Create a new asset category
exports.createCategory = async (req, res) => {
  try {
    const { name, description, customFields } = req.body;

    const category = new AssetCategory({
      name,
      description,
      customFields: customFields || [],
      tenantId: req.user.tenantId,
      createdBy: req.user.userId,
    });

    await category.save();

    res.status(201).json({
      message: "Asset category created successfully",
      category,
    });
  } catch (error) {
    console.error("Create category error:", error);
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Category with this name already exists" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all categories for tenant
exports.getCategories = async (req, res) => {
  try {
    const { includeInactive } = req.query;

    const query = { tenantId: req.user.tenantId };
    if (!includeInactive || includeInactive === "false") {
      query.isActive = true;
    }

    const categories = await AssetCategory.find(query)
      .populate("createdBy", "name")
      .populate("updatedBy", "name")
      .sort({ createdAt: -1 });

    res.json(categories);
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get single category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const category = await AssetCategory.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    })
      .populate("createdBy", "name")
      .populate("updatedBy", "name");

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(category);
  } catch (error) {
    console.error("Get category error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { name, description, customFields } = req.body;

    const category = await AssetCategory.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (customFields) category.customFields = customFields;
    category.updatedBy = req.user.userId;

    await category.save();

    res.json({
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error("Update category error:", error);
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Category with this name already exists" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete category (soft delete by setting isActive to false)
exports.deleteCategory = async (req, res) => {
  try {
    const category = await AssetCategory.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // TODO: Check if category is being used by any assets
    // For now, just soft delete
    category.isActive = false;
    category.updatedBy = req.user.userId;
    await category.save();

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Toggle category status
exports.toggleCategoryStatus = async (req, res) => {
  try {
    const category = await AssetCategory.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    category.isActive = !category.isActive;
    category.updatedBy = req.user.userId;
    await category.save();

    res.json({
      message: `Category ${
        category.isActive ? "activated" : "deactivated"
      } successfully`,
      category,
    });
  } catch (error) {
    console.error("Toggle category status error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
