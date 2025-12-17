const Designation = require("../models/Designation");

// Get all designations for the tenant
exports.getDesignations = async (req, res) => {
  try {
    if (!req.user || !req.user.tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const designations = await Designation.find({
      tenantId: req.user.tenantId,
    }).sort({ name: 1 });

    res.json(designations);
  } catch (err) {
    console.error("Get Designations Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Create a new designation
exports.createDesignation = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const existingDesignation = await Designation.findOne({
      name,
      tenantId,
    });

    if (existingDesignation) {
      return res
        .status(400)
        .json({ message: "Designation with this name already exists" });
    }

    const newDesignation = new Designation({
      name,
      description,
      status,
      tenantId,
      createdBy: req.user.id,
    });

    const savedDesignation = await newDesignation.save();
    res.status(201).json(savedDesignation);
  } catch (err) {
    console.error("Create Designation Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update a designation
exports.updateDesignation = async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const tenantId = req.user.tenantId;

    // Check if updating name causing duplicate
    if (name) {
      const existingDesignation = await Designation.findOne({
        name,
        tenantId,
        _id: { $ne: req.params.id },
      });

      if (existingDesignation) {
        return res
          .status(400)
          .json({ message: "Designation with this name already exists" });
      }
    }

    const designation = await Designation.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { name, description, status },
      { new: true }
    );

    if (!designation) {
      return res.status(404).json({ message: "Designation not found" });
    }

    res.json(designation);
  } catch (err) {
    console.error("Update Designation Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a designation
exports.deleteDesignation = async (req, res) => {
  try {
    const designation = await Designation.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!designation) {
      return res.status(404).json({ message: "Designation not found" });
    }

    res.json({ message: "Designation deleted successfully" });
  } catch (err) {
    console.error("Delete Designation Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
