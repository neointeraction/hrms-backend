const Resignation = require("../models/Resignation");
const Employee = require("../models/Employee");
const User = require("../models/User");
const Clearance = require("../models/Clearance");
const AssetAssignment = require("../models/AssetAssignment");

// Submit Resignation
exports.submitResignation = async (req, res) => {
  try {
    const { lastWorkingDay, reason } = req.body;
    const userId = req.user.userId;
    const tenantId = req.user.tenantId;

    const employee = await Employee.findOne({ user: userId });

    if (!employee) {
      return res.status(404).json({ message: "Employee profile not found" });
    }

    // Check if already has active resignation
    const activeResignation = await Resignation.findOne({
      employee: employee._id,
      status: { $in: ["pending", "approved"] },
    });

    if (activeResignation) {
      return res
        .status(400)
        .json({ message: "You already have an active resignation request." });
    }

    const resignation = new Resignation({
      employee: employee._id,
      tenantId,
      manager: employee.reportingManager, // Assuming this field exists on Employee
      lastWorkingDay,
      reason,
      history: [
        {
          action: "submitted",
          performedBy: userId,
          comment: "Resignation submitted",
        },
      ],
    });

    await resignation.save();

    res
      .status(201)
      .json({ message: "Resignation submitted successfully", resignation });
  } catch (error) {
    console.error("Submit Resignation Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get My Resignation Status
exports.getMyResignation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const employee = await Employee.findOne({ user: userId });

    if (!employee) {
      // If user is admin but not an employee, might return empty or specific msg
      return res.status(404).json({ message: "Employee profile not found" });
    }

    const resignation = await Resignation.findOne({
      employee: employee._id,
    })
      .sort({ createdAt: -1 })
      .populate("manager", "firstName lastName");

    res.json(resignation || null);
  } catch (error) {
    console.error("Get My Resignation Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Pending Resignations (For HR/Manager)
exports.getPendingResignations = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { tenantId: req.user.tenantId };

    if (status) {
      query.status = status;
    }

    // If manager, filter by reporting team?
    // For MVP, assuming Admin/HR sees all, Manager sees direct reports
    // This logic depends on RBAC implementation details.
    // Implementing generic fetch for now.

    const resignations = await Resignation.find(query)
      .populate(
        "employee",
        "firstName lastName designation department profilePicture"
      )
      .populate("manager", "firstName lastName")
      .sort({ createdAt: -1 });

    res.json(resignations);
  } catch (error) {
    console.error("Get Pending Resignations Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update Resignation Status
exports.updateResignationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comments, lastWorkingDay } = req.body;
    const userId = req.user.userId;

    const resignation = await Resignation.findById(id);
    if (!resignation) {
      return res.status(404).json({ message: "Resignation not found" });
    }

    // Authorization check could be added here (is Manager or HR)

    if (status) resignation.status = status;
    if (comments) resignation.comments = comments;
    if (lastWorkingDay) resignation.lastWorkingDay = lastWorkingDay;

    resignation.history.push({
      action: status || "updated",
      performedBy: userId,
      comment: comments || `Status updated to ${status}`,
    });

    await resignation.save();

    // Automation: Create Clearance details if Approved
    if (status === "Approved") {
      const existingClearance = await Clearance.findOne({ resignation: id });
      if (!existingClearance) {
        // Fetch Assigned Assets
        const assignedAssets = await AssetAssignment.find({
          employeeId: resignation.employee,
          status: { $in: ["Active", "Pending Acknowledgement"] },
        }).populate("assetId");

        const assetsToReturn = assignedAssets.map((assignment) => ({
          assetAssignment: assignment._id,
          assetName: assignment.assetId
            ? assignment.assetId.name
            : "Unknown Asset",
          assetCode: assignment.assetId ? assignment.assetId.assetCode : "N/A",
          status: "Pending",
        }));

        // Default Checklist
        const checklist = [
          {
            task: "Revoke Systems Access",
            department: "IT",
            status: "Pending",
          },
          {
            task: "Email Account Deactivation",
            department: "IT",
            status: "Pending",
          },
          { task: "ID Card Return", department: "Admin", status: "Pending" },
          {
            task: "Full & Final Settlement",
            department: "Finance",
            status: "Pending",
          },
          { task: "Exit Interview", department: "HR", status: "Pending" },
        ];

        await Clearance.create({
          resignation: id,
          employee: resignation.employee,
          tenantId: resignation.tenantId,
          assetsToReturn,
          checklist,
          createdBy: userId,
        });
        console.log(`Auto-generated Clearance for Resignation ${id}`);
      }
    }

    res.json({ message: "Resignation updated successfully", resignation });
  } catch (error) {
    console.error("Update Resignation Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
