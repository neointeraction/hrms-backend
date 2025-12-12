const Leave = require("../models/Leave");
const Employee = require("../models/Employee");
const User = require("../models/User");
const Role = require("../models/Role");
const LeavePolicy = require("../models/LeavePolicy");
const { createNotification } = require("./notification.controller");
const mongoose = require("mongoose");

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

const notifyHR = async ({
  title,
  message,
  relatedId,
  type = "LEAVE",
  tenantId,
}) => {
  try {
    // 1. Find Role IDs for HR and Admin in this tenant
    const hrRoles = await Role.find({
      name: { $in: ["HR", "Admin"] },
      tenantId,
    });
    const hrRoleIds = hrRoles.map((r) => r._id);

    // 2. Find Users with these roles in this tenant
    const hrUsers = await User.find({ roles: { $in: hrRoleIds }, tenantId });

    // 3. Send Notification to each
    for (const user of hrUsers) {
      await createNotification({
        recipient: user._id,
        type,
        title,
        message,
        relatedId,
        tenantId, // Add tenantId
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
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    // Find employee associated with user in this tenant
    const employee = await Employee.findOne({
      user: userId,
      tenantId,
    }).populate({
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
      return res.status(400).json({
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
      tenantId,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
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
        tenantId, // Add tenantId
      });
    } else if (employee.reportingManager && employee.reportingManager.user) {
      // Notify Manager
      await createNotification({
        recipient: employee.reportingManager.user._id,
        type: "LEAVE",
        title: "New Leave Request",
        message: `${employee.firstName} ${employee.lastName} has applied for ${type} leave.`,
        relatedId: newLeave._id,
        tenantId,
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
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const employee = await Employee.findOne({ user: userId, tenantId });

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
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    let query = { status: "Pending", tenantId };
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
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    console.log(`DEBUG: approveLeave id=${id} roles=${userRoles}`);

    const leave = await Leave.findOne({ _id: id, tenantId }).populate({
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
        tenantId, // Add tenantId
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
        tenantId, // Add tenantId
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
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const leave = await Leave.findOneAndUpdate(
      { _id: id, tenantId },
      { status, remarks },
      { new: true }
    ).populate("employee");

    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    // Trigger Notification
    await createNotification({
      recipient: leave.employee.user, // User ID directly from employee doc
      type: "LEAVE",
      title: "Leave Request Updated",
      message: `Your leave request from ${new Date(
        leave.startDate
      ).toLocaleDateString()} to ${new Date(
        leave.endDate
      ).toLocaleDateString()} has been ${status}.`,
      relatedId: leave._id,
      tenantId, // Add tenantId
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
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const leave = await Leave.findOne({ _id: id, tenantId }).populate(
      "employee"
    );
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
        tenantId, // Add tenantId
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
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const employee = await Employee.findOne({ user: userId, tenantId });

    if (!employee) {
      return res.status(404).json({ message: "Employee profile not found" });
    }

    // Determine Leave Types and Limits based on Role/Type
    // Determine Leave Types and Limits based on Tenant Policy
    let leavePolicy = {};

    const policies = await LeavePolicy.find({
      tenantId,
      status: "Active",
    });

    if (policies.length > 0) {
      policies.forEach((policy) => {
        // Check eligibility
        const eligibility = policy.eligibility || {};

        // 1. Employee Type check
        if (
          eligibility.employeeTypes &&
          eligibility.employeeTypes.length > 0 &&
          !eligibility.employeeTypes.includes("All") &&
          !eligibility.employeeTypes.includes(employee.employmentType)
        ) {
          return; // Skip if type doesn't match
        }

        // 2. Gender check
        if (
          eligibility.gender &&
          eligibility.gender !== "All" &&
          eligibility.gender !== employee.gender
        ) {
          return;
        }

        // Add to policy map (Use policy Name or Type)
        // Using Type to group standard leaves, but name might be more descriptive
        // For stats consistency, let's use Type if standard, or Name if Custom
        const key =
          policy.type === "Custom" ? policy.name : policy.type || policy.name;
        leavePolicy[key] = policy.allocation.count;
      });
    } else {
      // Fallback defaults if no policy configured yet
      leavePolicy = {
        Casual: 12,
        Sick: 6,
        Floating: 0,
      };

      // Simple hardcoded fallbacks based on type still useful for scaffolding
      if (
        employee.employmentType === "Intern" ||
        employee.employeeStatus === "Probation"
      ) {
        leavePolicy = { Casual: 1, Sick: 0 };
      }
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

    if (!req.user || !req.user.tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const leaves = await Leave.find({
      tenantId: req.user.tenantId, // Filter by tenant
      status: "Approved",
      startDate: { $lte: endOfDay },
      endDate: { $gte: startOfDay },
    }).populate(
      "employee",
      "firstName lastName _id profilePicture designation department"
    );

    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// HR Overview: Get All Leaves with Filters and Aggregation
exports.getHRLeaveOverview = async (req, res) => {
  try {
    const { month, year, department, employee, type, status } = req.query;
    const tenantId = req.user.tenantId;

    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    // Date Range Calculation
    const effectiveYear = parseInt(year) || new Date().getFullYear();
    const effectiveMonth = parseInt(month)
      ? parseInt(month) - 1
      : new Date().getMonth(); // 0-indexed

    const startOfMonth = new Date(effectiveYear, effectiveMonth, 1);
    const endOfMonth = new Date(
      effectiveYear,
      effectiveMonth + 1,
      0,
      23,
      59,
      59,
      999
    );

    // Build Query
    let query = {
      tenantId: new mongoose.Types.ObjectId(tenantId),
      startDate: { $gte: startOfMonth, $lte: endOfMonth },
    };

    if (type && type !== "All") query.type = type;
    if (status && status !== "All") query.status = status;

    // Fetch Leaves with populate
    // We will use aggregation to join employee first to support filtering
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: "employees",
          localField: "employee",
          foreignField: "_id",
          as: "employeeDetails",
        },
      },
      { $unwind: "$employeeDetails" },
      {
        $lookup: {
          from: "users",
          localField: "employeeDetails.user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
    ];

    // Apply Employee Filters
    const matchEmployee = {};
    if (department && department !== "All")
      matchEmployee["employeeDetails.department"] = department;

    if (employee && employee !== "All") {
      // Assuming frontend sends User ID (common pattern) or Employee ID.
      // Let's try matching User ID since 'getEmployees' returns that structure usually.
      // If we want to be robust, we can try to match either.
      // But typically filtering is by User ID in this app context.
      matchEmployee["employeeDetails.user"] = new mongoose.Types.ObjectId(
        employee
      );
    }

    if (Object.keys(matchEmployee).length > 0) {
      pipeline.push({ $match: matchEmployee });
    }

    // Sort
    pipeline.push({ $sort: { startDate: -1 } });

    const leaves = await Leave.aggregate(pipeline);

    // Calculate Total Leaves Taken per Employee for this Month
    // We can do a separate aggregation for totals
    const totalLeavesPipeline = [
      {
        $match: {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          status: "Approved", // Only count approved? Req says "Total Leaves Taken", implies approved.
          startDate: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: "$employee",
          totalMonthLeaves: { $sum: "$totalDays" },
        },
      },
    ];

    const totals = await Leave.aggregate(totalLeavesPipeline);

    // Map totals for O(1) lookup
    const totalsMap = {};
    totals.forEach((t) => {
      totalsMap[t._id.toString()] = t.totalMonthLeaves;
    });

    // Merge Results
    const validLeaves = leaves.map((leave) => ({
      ...leave,

      // Flatten structure for easier frontend consumption
      employeeName:
        leave.employeeDetails.firstName + " " + leave.employeeDetails.lastName,
      employeeId: leave.employeeDetails.employeeId,
      department: leave.employeeDetails.department,
      designation: leave.employeeDetails.designation,

      totalLeavesTakenMonth: totalsMap[leave.employee.toString()] || 0,
    }));

    res.json(validLeaves);
  } catch (error) {
    console.error("HR Leave Overview Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
