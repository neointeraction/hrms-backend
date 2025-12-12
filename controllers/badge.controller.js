const Badge = require("../models/Badge");
const fs = require("fs");
const path = require("path");

exports.createBadge = async (req, res) => {
  try {
    const { title } = req.body;
    const tenantId = req.user.tenantId;

    if (!req.file) {
      return res.status(400).json({ message: "Badge icon is required" });
    }

    const badge = new Badge({
      tenantId,
      title,
      icon: `/uploads/badges/${req.file.filename}`, // Assuming standardized upload path
    });

    await badge.save();
    res.status(201).json(badge);
  } catch (error) {
    console.error("Error creating badge:", error);
    res
      .status(500)
      .json({ message: "Failed to create badge", error: error.message });
  }
};

exports.getBadges = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const badges = await Badge.find({ tenantId }).sort({ createdAt: -1 });
    res.json(badges);
  } catch (error) {
    console.error("Error fetching badges:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch badges", error: error.message });
  }
};

exports.deleteBadge = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const badge = await Badge.findOne({ _id: id, tenantId });

    if (!badge) {
      return res.status(404).json({ message: "Badge not found" });
    }

    // Optional: Delete file from filesystem
    // const filePath = path.join(__dirname, '..', badge.icon);
    // if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await Badge.findByIdAndDelete(id);
    res.json({ message: "Badge deleted successfully" });
  } catch (error) {
    console.error("Error deleting badge:", error);
    res
      .status(500)
      .json({ message: "Failed to delete badge", error: error.message });
  }
};

exports.updateBadge = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const tenantId = req.user.tenantId;

    const badge = await Badge.findOne({ _id: id, tenantId });

    if (!badge) {
      if (req.file) {
        // Clean up uploaded file if badge not found
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: "Badge not found" });
    }

    if (title) badge.title = title;

    if (req.file) {
      // Delete old icon if it exists
      const oldIconPath = path.join(__dirname, "..", badge.icon);
      if (fs.existsSync(oldIconPath)) {
        try {
          fs.unlinkSync(oldIconPath);
        } catch (err) {
          console.error("Failed to delete old badge icon:", err);
        }
      }
      badge.icon = `/uploads/badges/${req.file.filename}`;
    }

    await badge.save();
    res.json(badge);
  } catch (error) {
    console.error("Error updating badge:", error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res
      .status(500)
      .json({ message: "Failed to update badge", error: error.message });
  }
};
