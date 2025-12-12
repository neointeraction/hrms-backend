const EmailSettings = require("../models/EmailSettings");
const EmailAudit = require("../models/EmailAudit");
const { processEmailAutomation } = require("../jobs/email.cron");

// Get Settings for logged-in tenant
exports.getSettings = async (req, res) => {
  console.log("DEBUG: getSettings called by user:", req.user);
  try {
    let settings = await EmailSettings.findOne({ tenantId: req.user.tenantId });
    if (!settings) {
      console.log(
        "DEBUG: No settings found, creating default for tenant:",
        req.user.tenantId
      );
      // Create default if not exists
      settings = await EmailSettings.create({ tenantId: req.user.tenantId });
    }
    res.json(settings);
  } catch (error) {
    console.error("DEBUG: getSettings error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Update Settings
exports.updateSettings = async (req, res) => {
  try {
    const settings = await EmailSettings.findOneAndUpdate(
      { tenantId: req.user.tenantId },
      { $set: req.body },
      { new: true, upsert: true } // upsert just in case
    );
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Manual Trigger
exports.triggerManual = async (req, res) => {
  try {
    // Run async in background or await?
    // Await to return immediate feedback for audit log
    await processEmailAutomation(req.user.tenantId);
    res.json({ message: "Email automation triggered successfully." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Audit Logs
exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await EmailAudit.find({ tenantId: req.user.tenantId })
      .sort({ sentAt: -1 })
      .limit(100); // Limit to last 100
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
