const AssetHistory = require("../models/AssetHistory");

// Get asset history
const getAssetHistory = async (req, res) => {
  try {
    const { assetId } = req.params;

    const history = await AssetHistory.find({
      assetId,
      tenantId: req.user.tenantId,
    })
      .populate("performedBy", "name")
      .populate("employeeId", "firstName lastName")
      .sort({ timestamp: -1 });

    res.json(history);
  } catch (error) {
    console.error("Get asset history error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all history logs (for audit)
const getAllHistory = async (req, res) => {
  try {
    const { action, startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = { tenantId: req.user.tenantId };

    if (action) query.action = action;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [history, total] = await Promise.all([
      AssetHistory.find(query)
        .populate("assetId", "name assetCode")
        .populate("performedBy", "name")
        .populate("employeeId", "firstName lastName")
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AssetHistory.countDocuments(query),
    ]);

    res.json({
      history,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get all history error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getAssetHistory,
  getAllHistory,
};
