const Leave = require("../models/Leave");
const Employee = require("../models/Employee");
const User = require("../models/User");

// Calculate total days between two dates
const calculateTotalDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

// Helper: Check role
const hasRole = (userRoles, role) => userRoles && userRoles.includes(role);

// Apply for Leave
exports.applyLeave = async (req, res) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    const userId = req.user.userId;
    const userRoles = req.user.roles || [];

    // Find employee associated with user
    const employee = await Employee.findOne({ user: userId });
    if (!employee) {
      return res.status(404).json({ message: "Employee profile not found" });
    }

    // Basic Validation
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const totalDays = calculateTotalDays(startDate, endDate);

    // Initial Workflow Status based on Role
    let workflowStatus = "Pending Approval";

    if (hasRole(userRoles, "Project Manager")) {
      workflowStatus = "Pending HR";
    } else if (hasRole(userRoles, "Intern")) {
      workflowStatus = "Pending HR";
    } else if (hasRole(userRoles, "Consultant")) {
      workflowStatus = "Pending PM";
    } else if (hasRole(userRoles, "Employee")) {
      workflowStatus = "Pending PM";
    }

    const newLeave = new Leave({
      employee: employee._id,
      type,
      startDate,
      endDate,
      reason,
      totalDays,
      status: "Pending",
      workflowStatus,
    });

    await newLeave.save();
    res
      .status(201)
      .json({ message: "Leave applied successfully", leave: newLeave });
  } catch (error) {
    console.error("Apply leave error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get My Leaves
exports.getMyLeaves = async (req, res) => {
  try {
    const userId = req.user.userId;
    const employee = await Employee.findOne({ user: userId });

    if (!employee) {
      return res.status(404).json({ message: "Employee profile not found" });
    }

    const leaves = await Leave.find({ employee: employee._id }).sort({
      createdAt: -1,
    });
    res.json({ leaves });
  } catch (error) {
    console.error("Get my leaves error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Pending Approvals (for Managers/HR)
exports.getPendingApprovals = async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    let query = { status: "Pending" };
    let authorized = false;

    // HR and Admin allow viewing ALL pending requests
    if (hasRole(userRoles, "HR") || hasRole(userRoles, "Admin")) {
      // No workflowStatus filter needed, they see all 'Pending' leaves
      // Or if we want to be specific:
      // query.workflowStatus = { $in: ["Pending PM", "Pending HR"] };
      // Let's allow them to see all to be safe.
      authorized = true;
    } else if (hasRole(userRoles, "Project Manager")) {
      // PM sees leaves that are 'Pending PM'
      query.workflowStatus = "Pending PM";
      authorized = true;
    }

    if (!authorized) {
      return res
        .status(403)
        .json({ message: "Unauthorized to view approvals" });
    }

    const leaves = await Leave.find(query)
      .populate("employee", "firstName lastName employeeId designation")
      .sort({ startDate: 1 });

    res.json({ leaves });
  } catch (error) {
    console.error("Get pending approvals error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Approve Leave
exports.approveLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const userRoles = req.user.roles || [];
    const approverId = req.user.userId;

    console.log(`DEBUG: approveLeave id=${id} roles=${userRoles}`);

    const leave = await Leave.findById(id).populate("employee");
    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    console.log(`DEBUG: leave.workflowStatus=${leave.workflowStatus}`);

    // Role-based Approval Logic
    let approved = false;
    let nextStatus = "";
    const isHR = hasRole(userRoles, "HR") || hasRole(userRoles, "Admin");
    const isPM = hasRole(userRoles, "Project Manager");

    if (leave.workflowStatus === "Pending PM") {
      if (isHR) {
        // HR Direct Approval (Override)
        approved = true;
        nextStatus = "Approved"; // HR approval is final
      } else if (isPM) {
        approved = true;
        // PM Approval Logic
        const employeeUser = await User.findById(leave.employee.user).populate(
          "roles"
        );
        const employeeRoles = employeeUser
          ? employeeUser.roles.map((r) => r.name)
          : ["Employee"];

        if (hasRole(employeeRoles, "Consultant")) {
          nextStatus = "Approved";
        } else {
          nextStatus = "Pending HR";
        }
      }
    } else if (
      leave.workflowStatus === "Pending HR" ||
      leave.workflowStatus === "Pending Approval"
    ) {
      // 'Pending Approval' is a fallback status for legacy/unknown role requests. Treat as Pending HR.
      if (isHR) {
        approved = true;
        nextStatus = "Approved";
      }
    }

    if (!approved) {
      console.log("DEBUG: Approval failed. conditions not met.");
      return res.status(400).json({
        message: "Invalid approval action for current status or role",
      });
    }

    if (nextStatus === "Approved") {
      leave.status = "Approved";
      leave.workflowStatus = "Approved";
    } else {
      leave.workflowStatus = nextStatus;
    }

    leave.approvals.push({
      approver: approverId,
      role: isHR ? "HR" : "Project Manager", // Record who actually acted
      status: "Approved",
      comments,
    });

    await leave.save();
    res.json({ message: "Leave approved successfully", leave });
  } catch (error) {
    console.error("Approve leave error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Reject Leave
exports.rejectLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const approverId = req.user.userId;
    const userRoles = req.user.roles || [];

    const leave = await Leave.findById(id);
    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    // Validate permission to reject based on status
    let canReject = false;
    let actingRole = "";
    const isHR = hasRole(userRoles, "HR") || hasRole(userRoles, "Admin");
    const isPM = hasRole(userRoles, "Project Manager");

    if (leave.workflowStatus === "Pending PM") {
      if (isHR) {
        canReject = true;
        actingRole = "HR";
      } else if (isPM) {
        canReject = true;
        actingRole = "Project Manager";
      }
    } else if (leave.workflowStatus === "Pending HR") {
      if (isHR) {
        canReject = true;
        actingRole = "HR";
      }
    }

    if (!canReject) {
      return res
        .status(403)
        .json({ message: "Unauthorized to reject this leave request" });
    }

    leave.status = "Rejected";
    leave.workflowStatus = "Rejected";
    leave.approvals.push({
      approver: approverId,
      role: actingRole,
      status: "Rejected",
      comments,
    });

    await leave.save();
    res.json({ message: "Leave rejected", leave });
  } catch (error) {
    console.error("Reject leave error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
