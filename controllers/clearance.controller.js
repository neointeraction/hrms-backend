const Clearance = require("../models/Clearance");
const Resignation = require("../models/Resignation");
const AssetAssignment = require("../models/AssetAssignment");
const Employee = require("../models/Employee");

// Initialize or Get Clearance for a Resignation
exports.getClearance = async (req, res) => {
  try {
    const { resignationId } = req.params;
    const tenantId = req.user.tenantId;

    // 1. Check if clearance already exists
    let clearance = await Clearance.findOne({ resignation: resignationId })
      .populate("resignation")
      .populate(
        "employee",
        "firstName lastName designation department profilePicture"
      );

    if (clearance) {
      return res.json(clearance);
    }

    // 2. If not, create it dynamically
    const resignation = await Resignation.findById(resignationId).populate(
      "employee"
    );

    if (!resignation) {
      return res.status(404).json({ message: "Resignation request not found" });
    }

    // Fetch currently assigned assets
    const activeAssignments = await AssetAssignment.find({
      employeeId: resignation.employee._id,
      status: { $in: ["Active", "Pending Acknowledgement"] },
    }).populate("assetId", "name assetCode");

    const assetsToReturn = activeAssignments.map((assignment) => ({
      assetAssignment: assignment._id,
      assetName: assignment.assetId.name,
      assetCode: assignment.assetId.assetCode,
      status: "Pending",
    }));

    // Default Checklist items
    const defaultChecklist = [
      { task: "Revoke Email Access", department: "IT", status: "Pending" },
      {
        task: "Revoke System Access (ERP/HRMS)",
        department: "IT",
        status: "Pending",
      },
      { task: "Collect ID Card", department: "Admin", status: "Pending" },
      {
        task: "Full & Final Settlement Calculation",
        department: "Finance",
        status: "Pending",
      },
      {
        task: "Knowledge Transfer (KT) Completion",
        department: "Manager",
        status: "Pending",
      },
      { task: "Exit Interview", department: "HR", status: "Pending" },
    ];

    clearance = new Clearance({
      resignation: resignationId,
      employee: resignation.employee._id,
      tenantId,
      assetsToReturn,
      checklist: defaultChecklist,
      createdBy: req.user.userId,
    });

    await clearance.save();

    // Re-fetch to populate if needed, or just return
    // Simple populate for response
    clearance = await Clearance.findById(clearance._id)
      .populate("resignation")
      .populate("employee", "firstName lastName designation department");

    res.json(clearance);
  } catch (error) {
    console.error("Get Clearance Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update Clearance Item (Asset or Checklist Task)
exports.updateClearanceItem = async (req, res) => {
  try {
    const { id } = req.params; // Clearance ID
    const { type, itemId, status, remarks } = req.body;
    // type: 'asset' or 'task'
    // itemId: _id of the item in the array

    const clearance = await Clearance.findById(id);
    if (!clearance) {
      return res.status(404).json({ message: "Clearance record not found" });
    }

    if (type === "asset") {
      const assetItem = clearance.assetsToReturn.id(itemId);
      if (assetItem) {
        assetItem.status = status;
        assetItem.remarks = remarks;
        if (status === "Returned") {
          assetItem.returnedDate = new Date();
        }
      }
    } else if (type === "task") {
      const taskItem = clearance.checklist.id(itemId);
      if (taskItem) {
        taskItem.status = status;
        taskItem.remarks = remarks;
        if (status === "Completed") {
          taskItem.completedAt = new Date();
          taskItem.completedBy = req.user.userId;
        }
      }
    }

    // Check overall status
    const allAssetsReturned = clearance.assetsToReturn.every(
      (a) =>
        a.status === "Returned" || a.status === "Lost" || a.status === "Damaged"
    ); // Assuming Lost/Damaged is also 'resolved' for clearance purposes (with penalty usually, but simplified here)
    const allTasksCompleted = clearance.checklist.every(
      (t) => t.status === "Completed" || t.status === "Waived"
    );

    if (allAssetsReturned && allTasksCompleted) {
      clearance.overallStatus = "Completed";
    } else {
      clearance.overallStatus = "In Progress";
    }

    await clearance.save();
    res.json(clearance);
  } catch (error) {
    console.error("Update Clearance Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
