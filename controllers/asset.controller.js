const Asset = require("../models/Asset");
const AssetHistory = require("../models/AssetHistory");
const mongoose = require("mongoose");

// Helper to log asset history
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

// Create a new asset
exports.createAsset = async (req, res) => {
  try {
    const {
      categoryId,
      name,
      manufacturer,
      model,
      serialNumber,
      purchaseDate,
      vendor,
      warrantyExpiry,
      condition,
      purchasePrice,
      currentValue,
      customFieldValues,
      notes,
    } = req.body;

    const asset = new Asset({
      categoryId,
      name,
      manufacturer,
      model,
      serialNumber,
      purchaseDate,
      vendor,
      warrantyExpiry,
      condition,
      purchasePrice,
      currentValue: currentValue || purchasePrice,
      customFieldValues,
      notes,
      tenantId: req.user.tenantId,
      createdBy: req.user.userId,
      image: req.file ? req.file.path : undefined,
    });

    await asset.save();

    // Log history
    await logHistory(asset._id, "Created", req.user.userId, {
      name: asset.name,
      assetCode: asset.assetCode,
    });

    res.status(201).json({
      message: "Asset created successfully",
      asset,
    });
  } catch (error) {
    console.error("Create asset error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all assets with filters
exports.getAssets = async (req, res) => {
  try {
    const {
      categoryId,
      status,
      condition,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const query = { tenantId: req.user.tenantId };

    if (categoryId) query.categoryId = categoryId;
    if (status) query.status = status;
    if (condition) query.condition = condition;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { assetCode: { $regex: search, $options: "i" } },
        { serialNumber: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [assetsData, total] = await Promise.all([
      Asset.find(query)
        .populate("categoryId", "name")
        .populate("createdBy", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Asset.countDocuments(query),
    ]);

    // Fetch active assignments for these assets
    const AssetAssignment = require("../models/AssetAssignment");
    const assetIds = assetsData.map((a) => a._id);
    const assignments = await AssetAssignment.find({
      assetId: { $in: assetIds },
      status: { $in: ["Active", "Pending Acknowledgement"] },
    }).populate("employeeId", "firstName lastName employeeId profilePicture");

    // Map assignments to assets
    const assignmentMap = {};
    assignments.forEach((assignment) => {
      if (assignment.employeeId) {
        assignmentMap[assignment.assetId.toString()] = {
          _id: assignment.employeeId._id,
          name: `${assignment.employeeId.firstName} ${assignment.employeeId.lastName}`,
          employeeId: assignment.employeeId.employeeId,
          profilePicture: assignment.employeeId.profilePicture,
        };
      }
    });

    const assets = assetsData.map((asset) => ({
      ...asset,
      assignedTo: assignmentMap[asset._id.toString()] || null,
    }));

    res.json({
      assets,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get assets error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get single asset by ID
exports.getAssetById = async (req, res) => {
  try {
    const asset = await Asset.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    })
      .populate("categoryId")
      .populate("createdBy", "name")
      .populate("updatedBy", "name");

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    res.json(asset);
  } catch (error) {
    console.error("Get asset error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update asset
exports.updateAsset = async (req, res) => {
  try {
    const {
      name,
      manufacturer,
      model,
      serialNumber,
      purchaseDate,
      vendor,
      warrantyExpiry,
      condition,
      purchasePrice,
      currentValue,
      customFieldValues,
      notes,
    } = req.body;

    const asset = await Asset.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    // Update fields
    if (name) asset.name = name;
    if (manufacturer !== undefined) asset.manufacturer = manufacturer;
    if (model !== undefined) asset.model = model;
    if (serialNumber !== undefined) asset.serialNumber = serialNumber;
    if (purchaseDate !== undefined) asset.purchaseDate = purchaseDate;
    if (vendor !== undefined) asset.vendor = vendor;
    if (warrantyExpiry !== undefined) asset.warrantyExpiry = warrantyExpiry;
    if (condition) asset.condition = condition;
    if (purchasePrice !== undefined) asset.purchasePrice = purchasePrice;
    if (currentValue !== undefined) asset.currentValue = currentValue;
    if (customFieldValues) asset.customFieldValues = customFieldValues;
    if (notes !== undefined) asset.notes = notes;
    if (req.file) {
      asset.image = req.file.path;
    }
    asset.updatedBy = req.user.userId;

    await asset.save();

    // Log history
    await logHistory(asset._id, "Updated", req.user.userId, {
      updatedFields: Object.keys(req.body),
    });

    res.json({
      message: "Asset updated successfully",
      asset,
    });
  } catch (error) {
    console.error("Update asset error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete asset (soft delete by changing status)
exports.deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    // Check if asset is currently issued
    if (asset.status === "Issued") {
      return res.status(400).json({
        message: "Cannot delete an asset that is currently issued",
      });
    }

    asset.status = "Disposed";
    asset.updatedBy = req.user.userId;
    await asset.save();

    // Log history
    await logHistory(asset._id, "Deleted", req.user.userId);

    res.json({ message: "Asset deleted successfully" });
  } catch (error) {
    console.error("Delete asset error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get asset statistics
exports.getAssetStats = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const [
      totalAssets,
      availableAssets,
      issuedAssets,
      underRepairAssets,
      lostAssets,
      disposedAssets,
      totalValue,
    ] = await Promise.all([
      Asset.countDocuments({ tenantId }),
      Asset.countDocuments({ tenantId, status: "Available" }),
      Asset.countDocuments({ tenantId, status: "Issued" }),
      Asset.countDocuments({ tenantId, status: "Under Repair" }),
      Asset.countDocuments({ tenantId, status: "Lost" }),
      Asset.countDocuments({ tenantId, status: "Disposed" }),
      Asset.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
        { $group: { _id: null, total: { $sum: "$currentValue" } } },
      ]),
    ]);

    // Get warranty expiring soon (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const warrantyExpiringSoon = await Asset.countDocuments({
      tenantId,
      warrantyExpiry: { $lte: thirtyDaysFromNow, $gte: new Date() },
    });

    res.json({
      totalAssets,
      availableAssets,
      issuedAssets,
      underRepairAssets,
      lostAssets,
      disposedAssets,
      warrantyExpiringSoon,
      totalValue: totalValue[0]?.total || 0,
    });
  } catch (error) {
    console.error("Get asset stats error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Dispose asset (permanent write-off)
exports.disposeAsset = async (req, res) => {
  try {
    const { disposalReason, disposalNotes, disposalDate } = req.body;

    const asset = await Asset.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    });

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    // Check if asset is currently issued
    if (asset.status === "Issued") {
      return res.status(400).json({
        message:
          "Cannot dispose an asset that is currently issued. Please return the asset first.",
      });
    }

    // Update asset to disposed
    asset.status = "Disposed";
    asset.updatedBy = req.user.userId;

    // Store disposal information in notes
    const disposalInfo = `\n--- DISPOSAL ---\nDate: ${
      disposalDate || new Date().toISOString()
    }\nReason: ${disposalReason}\nNotes: ${
      disposalNotes || "N/A"
    }\nDisposed by: ${req.user.userId}`;
    asset.notes = (asset.notes || "") + disposalInfo;

    await asset.save();

    // Log history
    await logHistory(asset._id, "Disposed", req.user.userId, {
      reason: disposalReason,
      disposalDate: disposalDate || new Date().toISOString(),
    });

    res.json({
      message: "Asset disposed successfully",
      asset,
    });
  } catch (error) {
    console.error("Dispose asset error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
