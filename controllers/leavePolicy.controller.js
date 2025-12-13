const LeavePolicy = require("../models/LeavePolicy");

exports.createPolicy = async (req, res) => {
  try {
    const policy = new LeavePolicy({
      ...req.body,
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
    const policy = await LeavePolicy.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      req.body,
      { new: true }
    );
    if (!policy) {
      return res.status(404).json({ message: "Policy not found" });
    }
    res.json({ message: "Policy updated", policy });
  } catch (error) {
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
