const AssetIncident = require("../models/AssetIncident");
const Asset = require("../models/Asset");
const AssetHistory = require("../models/AssetHistory");

// Helper to log history
const logHistory = async (assetId, action, performedBy, details = {}) => {
  try {
    const asset = await Asset.findById(assetId);
    if (!asset) return;

    await AssetHistory.create({
      assetId,
      action,
      performedBy,
      details,
      tenantId: asset.tenantId,
    });
  } catch (error) {
    console.error("Error logging asset history:", error);
  }
};

// Report an incident
exports.reportIncident = async (req, res) => {
  try {
    const {
      assetId,
      assignmentId,
      incidentType,
      description,
      incidentDate,
      urgency,
    } = req.body;

    // Get photos from uploaded files
    const photos = req.files
      ? req.files.map((file) => `/uploads/assets/incidents/${file.filename}`)
      : [];

    const incident = new AssetIncident({
      assetId,
      assignmentId,
      reportedBy: req.user.employeeId,
      incidentType,
      description,
      incidentDate: incidentDate || Date.now(),
      photos,
      urgency: urgency || "Medium",
      tenantId: req.user.tenantId,
    });

    await incident.save();

    // Update asset status if lost or damaged
    if (incidentType === "Lost") {
      const asset = await Asset.findById(assetId);
      if (asset) {
        asset.status = "Lost";
        await asset.save();
      }
    } else if (incidentType === "Damage") {
      const asset = await Asset.findById(assetId);
      if (asset) {
        asset.status = "Under Repair";
        asset.condition = "Damaged";
        await asset.save();
      }
    }

    // Log history
    await logHistory(assetId, "Damaged", req.user.userId, {
      incidentType,
      incidentId: incident._id,
    });

    await incident.populate([
      { path: "assetId", select: "name assetCode" },
      { path: "reportedBy", select: "firstName lastName" },
    ]);

    res.status(201).json({
      message: "Incident reported successfully",
      incident,
    });
  } catch (error) {
    console.error("Report incident error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all incidents
exports.getIncidents = async (req, res) => {
  try {
    const { status, assetId, incidentType } = req.query;

    const query = { tenantId: req.user.tenantId };
    if (status) query.status = status;
    if (assetId) query.assetId = assetId;
    if (incidentType) query.incidentType = incidentType;

    const incidents = await AssetIncident.find(query)
      .populate("assetId", "name assetCode")
      .populate("reportedBy", "firstName lastName email")
      .populate("resolvedBy", "name")
      .sort({ createdAt: -1 });

    res.json(incidents);
  } catch (error) {
    console.error("Get incidents error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get single incident
exports.getIncidentById = async (req, res) => {
  try {
    const incident = await AssetIncident.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    })
      .populate("assetId")
      .populate("reportedBy", "firstName lastName email")
      .populate("resolvedBy", "name");

    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    res.json(incident);
  } catch (error) {
    console.error("Get incident error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update incident
exports.updateIncident = async (req, res) => {
  try {
    const {
      status,
      resolution,
      repairCost,
      repairVendor,
      employeeChargeAmount,
    } = req.body;

    const incident = await AssetIncident.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    if (status) incident.status = status;
    if (resolution) incident.resolution = resolution;
    if (repairCost !== undefined) incident.repairCost = repairCost;
    if (repairVendor) incident.repairVendor = repairVendor;
    if (employeeChargeAmount !== undefined)
      incident.employeeChargeAmount = employeeChargeAmount;

    await incident.save();

    res.json({
      message: "Incident updated successfully",
      incident,
    });
  } catch (error) {
    console.error("Update incident error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Resolve incident
exports.resolveIncident = async (req, res) => {
  try {
    const { resolution, repairCost, repairVendor } = req.body;

    const incident = await AssetIncident.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    incident.status = "Resolved";
    incident.resolution = resolution;
    incident.repairCost = repairCost;
    incident.repairVendor = repairVendor;
    incident.resolvedBy = req.user.userId;
    incident.resolvedAt = Date.now();

    await incident.save();

    // Update asset status back to available if repaired
    if (incident.incidentType === "Damage") {
      const asset = await Asset.findById(incident.assetId);
      if (asset && asset.status === "Under Repair") {
        asset.status = "Available";
        asset.condition = "Good";
        await asset.save();

        // Log history
        await logHistory(asset._id, "Repaired", req.user.userId, {
          incidentId: incident._id,
        });
      }
    }

    res.json({
      message: "Incident resolved successfully",
      incident,
    });
  } catch (error) {
    console.error("Resolve incident error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
