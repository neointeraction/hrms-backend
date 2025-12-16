const LeavePolicy = require("../models/LeavePolicy");

exports.createPolicy = async (req, res) => {
  try {
    let policyData = req.body;

    // If sent as FormData with 'data' JSON string
    if (req.body.data) {
      try {
        policyData = JSON.parse(req.body.data);
      } catch (e) {
        return res.status(400).json({ message: "Invalid JSON data" });
      }
    }

    // Handle file upload
    if (req.file) {
      if (!policyData.docs) policyData.docs = {};
      // Local storage path: "uploads/filename.ext". We want "/uploads/filename.ext" for URL.
      const filename = req.file.filename;
      policyData.docs.documentUrl = `/uploads/${filename}`;
    }

    const policy = new LeavePolicy({
      ...policyData,
      tenantId: req.user.tenantId,
    });
    await policy.save();
    res
      .status(201)
      .json({ message: "Leave policy created successfully", policy });
  } catch (error) {
    console.error("Create Policy Error:", error);
    res
      .status(500)
      .json({ message: "Failed to create policy", error: error.message });
  }
};

exports.getPolicies = async (req, res) => {
  try {
    const policies = await LeavePolicy.find({ tenantId: req.user.tenantId });
    res.json({ policies });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch policies", error: error.message });
  }
};

exports.getPolicyById = async (req, res) => {
  try {
    const policy = await LeavePolicy.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });
    if (!policy) {
      return res.status(404).json({ message: "Policy not found" });
    }
    res.json({ policy });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch policy", error: error.message });
  }
};

exports.updatePolicy = async (req, res) => {
  try {
    let updates = req.body;

    // If sent as FormData with 'data' JSON string
    if (req.body.data) {
      try {
        updates = JSON.parse(req.body.data);
      } catch (e) {
        return res.status(400).json({ message: "Invalid JSON data" });
      }
    }

    // Handle file upload
    const getFileUrl = (file) => `/uploads/${file.filename}`;

    if (req.file) {
      // Simplest: If req.body is plain object and we have file:
      if (!updates.docs) updates.docs = {};
      updates.docs.documentUrl = getFileUrl(req.file);
    }

    let policy = await LeavePolicy.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });
    if (!policy) return res.status(404).json({ message: "Policy not found" });

    // Merge updates
    if (req.file) {
      policy.docs.documentUrl = getFileUrl(req.file);
    }

    Object.keys(updates).forEach((key) => {
      // Special check: don't overwrite docs with string/null if parsing failed
      if (key === "docs" && typeof updates[key] === "object") {
        policy.docs = { ...policy.docs, ...updates[key] };
        if (req.file) policy.docs.documentUrl = getFileUrl(req.file); // Ensure new file wins
      } else if (key !== "docs") {
        // Skip docs here logic already handled
        policy[key] = updates[key];
      }
    });

    // If updates didn't have docs but we have file
    if (req.file && !updates.docs) {
      policy.docs.documentUrl = getFileUrl(req.file);
    }

    await policy.save();

    res.json({ message: "Policy updated", policy });
  } catch (error) {
    console.error("Update Policy Error:", error);
    res
      .status(500)
      .json({ message: "Failed to update policy", error: error.message });
  }
};

exports.deletePolicy = async (req, res) => {
  try {
    const policy = await LeavePolicy.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });
    if (!policy) {
      return res.status(404).json({ message: "Policy not found" });
    }
    res.json({ message: "Policy deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete policy", error: error.message });
  }
};
