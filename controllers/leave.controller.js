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

// Apply for Leave
exports.applyLeave = async (req, res) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    const userId = req.user.userId;

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

    // Determine workflow based on user role (need to fetch user role if not in req.user properly)
    // Assuming req.user.role is populated from auth middleware
    const userRole = req.user.role;

    if (userRole === "Employee") {
      workflowStatus = "Pending PM";
    } else if (userRole === "Intern") {
      workflowStatus = "Pending HR";
    } else if (userRole === "Consultant") {
      workflowStatus = "Pending PM";
    } else if (userRole === "Project Manager") {
      workflowStatus = "Pending HR"; // PM applies, goes to HR? OR Auto-approve? Assuming HR.
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
    const userRole = req.user.role;
    let query = { status: "Pending" };

    if (userRole === "Project Manager") {
      // PM sees leaves that are 'Pending PM'
      // In a real app, query should filter by team members.
      // For MVP/Demo, PM sees all 'Pending PM' requests.
      query.workflowStatus = "Pending PM";
    } else if (userRole === "HR" || userRole === "Admin") {
      // HR sees leaves that are 'Pending HR'
      query.workflowStatus = "Pending HR";
    } else {
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
    const approverRole = req.user.role;
    const approverId = req.user.userId;

    const leave = await Leave.findById(id).populate("employee");
    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    // Logic for workflow transition
    if (
      leave.workflowStatus === "Pending PM" &&
      approverRole === "Project Manager"
    ) {
      // PM Approves -> Moves to HR for Employees, or Approved for Consultant?
      // Requirement: "Employee -> PM -> HR approval", "Consultant -> PM approval"

      // Check employee role (we need to access User model or store role in Employee or Leave)
      // We populated employee, let's look up the user to get the role if needed, or assume from context.
      // Let's fetch the user associated with the employee to check their role.
      const employeeUser = await User.findById(leave.employee.user);
      const requestorRole = employeeUser ? employeeUser.role : "Employee";

      if (requestorRole === "Consultant") {
        leave.status = "Approved";
        leave.workflowStatus = "Approved";
      } else {
        leave.workflowStatus = "Pending HR";
      }

      leave.approvals.push({
        approver: approverId,
        role: "Project Manager",
        status: "Approved",
        comments,
      });
    } else if (
      leave.workflowStatus === "Pending HR" &&
      (approverRole === "HR" || approverRole === "Admin")
    ) {
      leave.status = "Approved";
      leave.workflowStatus = "Approved";
      leave.approvals.push({
        approver: approverId,
        role: "HR",
        status: "Approved",
        comments,
      });

      // TODO: Update Leave Balance Here
      // TODO: DEDUCTIONS UPDATE PAYROLL AUTOMATICALLY (Mock integration)
    } else {
      return res
        .status(400)
        .json({
          message: "Invalid approval action for current status or role",
        });
    }

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
    const approverRole = req.user.role;

    const leave = await Leave.findById(id);
    if (!leave) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    leave.status = "Rejected";
    leave.workflowStatus = "Rejected";
    leave.approvals.push({
      approver: approverId,
      role: approverRole,
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
