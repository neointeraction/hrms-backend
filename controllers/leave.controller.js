const Leave = require("../models/Leave");
const Employee = require("../models/Employee");
const User = require("../models/User");
const Role = require("../models/Role");
const { createNotification } = require("./notification.controller");

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

const notifyHR = async ({ title, message, relatedId, type = "LEAVE" }) => {
  try {
    // 1. Find Role IDs for HR and Admin
    const hrRoles = await Role.find({ name: { $in: ["HR", "Admin"] } });
    const hrRoleIds = hrRoles.map((r) => r._id);

    // 2. Find Users with these roles
    const hrUsers = await User.find({ roles: { $in: hrRoleIds } });

    // 3. Send Notification to each
    for (const user of hrUsers) {
      await createNotification({
        recipient: user._id,
        type,
        title,
        message,
        relatedId,
      });
    }
  } catch (error) {
    console.error("notifyHR error:", error);
  }
};

// Apply for Leave
exports.applyLeave = async (req, res) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    const userId = req.user.userId;
    const userRoles = req.user.roles || [];

    // Find employee associated with user
    const employee = await Employee.findOne({ user: userId }).populate({
      path: "reportingManager",
      populate: { path: "user" },
    });
    if (!employee) {
      return res.status(404).json({ message: "Employee profile not found" });
    }

    // Basic Validation
    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check for overlapping leaves
    const overlappingLeave = await Leave.findOne({
      employee: employee._id,
      status: { $ne: "Rejected" },
      $or: [
        {
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(startDate) },
        },
      ],
    });

    if (overlappingLeave) {
      return res
        .status(400)
        .json({
          message: "You have already applied for leave during this period",
        });
    }

    let totalDays;
    const isHalfDay = req.body.isHalfDay === true;

    if (isHalfDay) {
      // For half day, start and end date must be same
      const start = new Date(startDate).setHours(0, 0, 0, 0);
      const end = new Date(endDate).setHours(0, 0, 0, 0);

      if (start !== end) {
        return res.status(400).json({
          message:
            "Start date and End date must be the same for Half Day leave",
        });
      }
      totalDays = 0.5;
    } else {
      totalDays = calculateTotalDays(startDate, endDate);
    }

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
      isHalfDay,
      status: "Pending",
      workflowStatus,
    });

    await newLeave.save();

    // Trigger Notification Logic
    if (workflowStatus === "Pending HR") {
      // Notify HR directly
      await notifyHR({
        title: "New Leave Request (Needs HR)",
        message: `${employee.firstName} ${employee.lastName} has applied for leave requiring HR approval.`,
        relatedId: newLeave._id,
      });
    } else if (employee.reportingManager && employee.reportingManager.user) {
      // Notify Manager
      await createNotification({
        recipient: employee.reportingManager.user._id,
        type: "LEAVE",
        title: "New Leave Request",
        message: `${employee.firstName} ${employee.lastName} has applied for ${type} leave.`,
        relatedId: newLeave._id,
      });
    }

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

    const leave = await Leave.findById(id).populate({
      path: "employee",
      populate: { path: "user" },
    });
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
        const employeeUser = await User.findById(
          leave.employee.user._id
        ).populate("roles");
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

    // NOTIFICATIONS
    if (nextStatus === "Pending HR") {
      // Notify HR that PM approved and it's their turn
      await notifyHR({
        title: "Leave Request Forwarded",
        message: `A leave request for ${leave.employee.firstName} ${leave.employee.lastName} has been approved by PM and requires HR approval.`,
        relatedId: leave._id,
      });
      // Also notify Employee? "Your leave is progressing" - Optional, maybe too noisy.
      // Let's stick to notifying employee only on Final decision for now, OR if specific update requested.
      // Actually, employee notification on update is good.
    }

    // Notify Employee (Always on update/approve)
    if (leave.employee && leave.employee.user) {
      await createNotification({
        recipient: leave.employee.user._id,
        type: "LEAVE",
        title: "Leave Request Update",
        message: `Your leave request status is now: ${
          nextStatus === "Approved" ? "Approved" : "Pending HR"
        }.`,
        relatedId: leave._id,
      });
    }

    res.json({ message: "Leave approved successfully", leave });
  } catch (error) {
    console.error("Approve leave error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const leave = await Leave.findByIdAndUpdate(
      id,
      { status, remarks },
      { new: true }
    ).populate("employee");

    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    // Trigger Notification
    await createNotification({
      recipient: leave.employee._id,
      type: "LEAVE",
      title: "Leave Request Updated",
      message: `Your leave request from ${new Date(
        leave.startDate
      ).toLocaleDateString()} to ${new Date(
        leave.endDate
      ).toLocaleDateString()} has been ${status}.`,
      relatedId: leave._id,
    });

    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reject Leave
exports.rejectLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const approverId = req.user.userId;
    const userRoles = req.user.roles || [];

    const leave = await Leave.findById(id).populate("employee");
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

    // Notification
    if (leave.employee && leave.employee.user) {
      await createNotification({
        recipient: leave.employee.user,
        type: "LEAVE",
        title: "Leave Request Rejected",
        message: `Your leave request has been rejected.`,
        relatedId: leave._id,
      });
    }

    res.json({ message: "Leave rejected", leave });
  } catch (error) {
    console.error("Reject leave error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// Get Leave Stats
exports.getLeaveStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    const employee = await Employee.findOne({ user: userId });

    if (!employee) {
      return res.status(404).json({ message: "Employee profile not found" });
    }

    // Determine Leave Types and Limits based on Role/Type
    let leavePolicy = {
      Casual: 12, // Default
      Sick: 6,
      Floating: 5,
    };

    const isIntern =
      employee.employmentType === "Intern" ||
      employee.employeeStatus === "Probation";
    const isConsultant = employee.employmentType === "Contract"; // Assuming Consultant = Contract

    if (isIntern) {
      // Calculate months of service for accumulated leaves
      const joiningDate = new Date(employee.dateOfJoining || new Date());
      const now = new Date();
      const monthsService =
        (now.getFullYear() - joiningDate.getFullYear()) * 12 +
        (now.getMonth() - joiningDate.getMonth()) +
        1; // Including current month

      const accruedLeaves = Math.min(monthsService, 12); // 1 per month, max 12

      leavePolicy = {
        Casual: accruedLeaves, // "One leave per month" mapped to Casual for simplicity/tracking
        Sick: 0,
        Floating: 0,
      };
    } else if (isConsultant) {
      leavePolicy = {
        Casual: 12,
        Sick: 6,
        Floating: 0,
      };
    }

    // Get Approved and Pending Leaves count for current year
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const endOfYear = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59);

    const mongoose = require("mongoose");
    const leaveStats = await Leave.aggregate([
      {
        $match: {
          employee: new mongoose.Types.ObjectId(employee._id),
          status: { $in: ["Approved", "Pending"] },
          startDate: { $gte: startOfYear, $lte: endOfYear },
        },
      },
      {
        $group: {
          _id: { type: "$type", status: "$status" },
          totalDays: { $sum: "$totalDays" },
        },
      },
    ]);

    const stats = Object.keys(leavePolicy).map((type) => {
      const approved =
        leaveStats.find(
          (l) => l._id.type === type && l._id.status === "Approved"
        )?.totalDays || 0;
      const pendingApproval =
        leaveStats.find(
          (l) => l._id.type === type && l._id.status === "Pending"
        )?.totalDays || 0;

      const used = approved;
      const reserved = pendingApproval;
      // Balance = Total - Used (Approved) - Reserved (Pending)
      const balance = Math.max(0, leavePolicy[type] - used - reserved);

      return {
        type,
        total: leavePolicy[type],
        used: used,
        pending: balance, // showing available balance
      };
    });

    res.json({ stats });
  } catch (error) {
    console.error("Get leave stats error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Employees currently on leave
exports.getEmployeesOnLeave = async (req, res) => {
  try {
    const today = new Date();

    // Set to start of day (local time)
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    // Set to end of day (local time)
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const leaves = await Leave.find({
      status: "Approved",
      startDate: { $lte: endOfDay },
      endDate: { $gte: startOfDay },
    }).populate(
      "employee",
      "firstName lastName _id profilePicture designation department"
    );

    res.json(leaves);
  } catch (error) {
    console.error("Get employees on leave error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
