const AssetAssignment = require("../models/AssetAssignment");
const Asset = require("../models/Asset");
const AssetHistory = require("../models/AssetHistory");

// Helper to log history
const logHistory = async (
  assetId,
  action,
  performedBy,
  employeeId,
  details = {}
) => {
  try {
    const asset = await Asset.findById(assetId);
    if (!asset) return;

    await AssetHistory.create({
      assetId,
      action,
      performedBy,
      employeeId,
      details,
      tenantId: asset.tenantId,
    });
  } catch (error) {
    console.error("Error logging asset history:", error);
  }
};

// Assign asset to employee
exports.assignAsset = async (req, res) => {
  try {
    const {
      assetId,
      employeeId,
      issueDate,
      expectedReturnDate,
      conditionAtIssue,
      notes,
    } = req.body;

    // Check if asset exists and is available
    const asset = await Asset.findOne({
      _id: assetId,
      tenantId: req.user.tenantId,
    });

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    if (asset.status !== "Available") {
      return res.status(400).json({
        message: `Asset is currently ${asset.status.toLowerCase()} and cannot be assigned`,
      });
    }

    // Create assignment
    const assignment = new AssetAssignment({
      assetId,
      employeeId,
      issueDate: issueDate || Date.now(),
      expectedReturnDate,
      conditionAtIssue: conditionAtIssue || asset.condition,
      notes,
      issuedBy: req.user.userId,
      tenantId: req.user.tenantId,
    });

    await assignment.save();

    // Update asset status
    asset.status = "Issued";
    await asset.save();

    // Log history
    await logHistory(assetId, "Assigned", req.user.userId, employeeId, {
      assignmentId: assignment._id,
      issueDate: assignment.issueDate,
    });

    // Populate assignment for response
    await assignment.populate([
      { path: "assetId", select: "name assetCode" },
      { path: "employeeId", select: "firstName lastName email" },
    ]);

    res.status(201).json({
      message:
        "Asset assigned successfully. Awaiting employee acknowledgement.",
      assignment,
    });
  } catch (error) {
    console.error("Assign asset error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Employee acknowledges receipt of asset
exports.acknowledgeAsset = async (req, res) => {
  try {
    const assignmentId = req.params.id;

    const assignment = await AssetAssignment.findOne({
      _id: assignmentId,
      tenantId: req.user.tenantId,
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    if (assignment.status !== "Pending Acknowledgement") {
      return res.status(400).json({
        message: "This assignment has already been acknowledged",
      });
    }

    // Update assignment
    assignment.acknowledgedAt = Date.now();
    assignment.acknowledgedBy = req.user.employeeId || assignment.employeeId;
    assignment.status = "Active";
    await assignment.save();

    // Log history
    await logHistory(
      assignment.assetId,
      "Acknowledged",
      req.user.userId,
      assignment.employeeId,
      { acknowledgedAt: assignment.acknowledgedAt }
    );

    res.json({
      message: "Asset acknowledgement recorded successfully",
      assignment,
    });
  } catch (error) {
    console.error("Acknowledge asset error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Initiate asset return
exports.returnAsset = async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const { conditionAtReturn, notes } = req.body;

    const assignment = await AssetAssignment.findOne({
      _id: assignmentId,
      tenantId: req.user.tenantId,
    }).populate("assetId");

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    if (assignment.status === "Returned") {
      return res
        .status(400)
        .json({ message: "Asset has already been returned" });
    }

    // Update assignment
    assignment.actualReturnDate = Date.now();
    assignment.conditionAtReturn = conditionAtReturn;
    if (notes) assignment.notes = (assignment.notes || "") + "\n" + notes;
    assignment.status = "Returned";
    await assignment.save();

    // Update asset status based on condition
    const asset = assignment.assetId;
    if (conditionAtReturn === "Damaged") {
      asset.status = "Under Repair";
    } else {
      asset.status = "Available";
    }
    asset.condition = conditionAtReturn;
    await asset.save();

    // Log history
    await logHistory(
      assignment.assetId._id,
      "Returned",
      req.user.userId,
      assignment.employeeId,
      {
        returnDate: assignment.actualReturnDate,
        condition: conditionAtReturn,
      }
    );

    res.json({
      message: "Asset return processed successfully",
      assignment,
    });
  } catch (error) {
    console.error("Return asset error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get employee's assigned assets
exports.getEmployeeAssets = async (req, res) => {
  try {
    let employeeId = req.params.employeeId;

    // If no specific employee ID requested, get for logged-in user
    if (!employeeId) {
      // Find the employee record associated with this user
      const Employee = require("../models/Employee");
      const employee = await Employee.findOne({
        user: req.user.userId,
        tenantId: req.user.tenantId,
      });

      if (!employee) {
        return res.json([]); // Return empty list if no employee profile found
      }
      employeeId = employee._id;
    }

    const assignments = await AssetAssignment.find({
      employeeId,
      tenantId: req.user.tenantId,
      status: { $in: ["Pending Acknowledgement", "Active"] },
    })
      .populate({
        path: "assetId",
        select: "name assetCode categoryId",
        populate: {
          path: "categoryId",
          select: "name",
        },
      })
      .populate("issuedBy", "name")
      .sort({ issueDate: -1 });

    res.json(assignments);
  } catch (error) {
    console.error("Get employee assets error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get pending acknowledgements (for HR/Admin)
exports.getPendingAcknowledgements = async (req, res) => {
  try {
    const assignments = await AssetAssignment.find({
      tenantId: req.user.tenantId,
      status: "Pending Acknowledgement",
    })
      .populate({
        path: "assetId",
        select: "name assetCode categoryId",
        populate: {
          path: "categoryId",
          select: "name",
        },
      })
      .populate("employeeId", "firstName lastName email")
      .populate("issuedBy", "name")
      .sort({ issueDate: -1 });

    res.json(assignments);
  } catch (error) {
    console.error("Get pending acknowledgements error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all assignments (for HR/Admin)
exports.getAssignments = async (req, res) => {
  try {
    const { status, employeeId } = req.query;

    const query = { tenantId: req.user.tenantId };
    if (status) query.status = status;
    if (employeeId) query.employeeId = employeeId;

    const assignments = await AssetAssignment.find(query)
      .populate({
        path: "assetId",
        select: "name assetCode categoryId",
        populate: {
          path: "categoryId",
          select: "name",
        },
      })
      .populate("employeeId", "firstName lastName email")
      .populate("issuedBy", "name")
      .sort({ issueDate: -1 });

    res.json(assignments);
  } catch (error) {
    console.error("Get assignments error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
