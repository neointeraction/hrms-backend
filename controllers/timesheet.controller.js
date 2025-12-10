const Timesheet = require("../models/Timesheet");
const Employee = require("../models/Employee");
const { createAuditLog } = require("../utils/auditLogger");

// Create Timesheet Entry
exports.createEntry = async (req, res) => {
  try {
    const { userId } = req.user;
    const { date, project, task, startTime, endTime, description } = req.body;

    const employee = await Employee.findOne({ user: userId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Calculate week ending date (Sunday)
    const entryDate = new Date(date);
    const dayOfWeek = entryDate.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const weekEnding = new Date(entryDate);
    weekEnding.setDate(entryDate.getDate() + daysUntilSunday);

    const timesheetEntry = new Timesheet({
      employee: employee._id,
      date,
      project,
      task,
      startTime,
      endTime,
      description,
      weekEnding,
    });

    await timesheetEntry.save(); // Pre-save hook calculates hours

    // Audit log
    await createAuditLog({
      entityType: "Timesheet",
      entityId: timesheetEntry._id,
      action: "create",
      performedBy: userId,
      employee: employee._id,
      metadata: { project: project, task: task, hours: timesheetEntry.hours },
    });

    res.status(201).json({
      message: "Timesheet entry created",
      entry: timesheetEntry,
    });
  } catch (error) {
    console.error("Create timesheet error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Timesheet Entries
exports.getEntries = async (req, res) => {
  try {
    const { userId } = req.user;
    const { startDate, endDate, status } = req.query;

    const employee = await Employee.findOne({ user: userId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const query = { employee: employee._id };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (status) {
      query.status = status;
    }

    const entries = await Timesheet.find(query).sort({ date: -1 });

    res.json({ entries });
  } catch (error) {
    console.error("Get timesheet entries error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update Timesheet Entry
exports.updateEntry = async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;
    const updates = req.body;

    const employee = await Employee.findOne({ user: userId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const entry = await Timesheet.findOne({
      _id: id,
      employee: employee._id,
    });

    if (!entry) {
      return res.status(404).json({ message: "Timesheet entry not found" });
    }

    // Don't allow updating submitted or approved entries
    if (entry.status === "approved" || entry.status === "submitted") {
      return res.status(400).json({
        message: `Cannot update ${entry.status} entries`,
      });
    }

    const oldValues = { ...entry.toObject() };
    Object.assign(entry, updates);
    await entry.save();

    // Audit log
    await createAuditLog({
      entityType: "Timesheet",
      entityId: entry._id,
      action: "update",
      performedBy: userId,
      employee: employee._id,
      changes: { old: oldValues, new: entry.toObject() },
    });

    res.json({
      message: "Timesheet entry updated",
      entry,
    });
  } catch (error) {
    console.error("Update timesheet error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete Timesheet Entry
exports.deleteEntry = async (req, res) => {
  try {
    const { userId } = req.user;
    const { id } = req.params;

    const employee = await Employee.findOne({ user: userId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const entry = await Timesheet.findOne({
      _id: id,
      employee: employee._id,
    });

    if (!entry) {
      return res.status(404).json({ message: "Timesheet entry not found" });
    }

    // Don't allow deleting submitted or approved entries
    if (entry.status === "approved" || entry.status === "submitted") {
      return res.status(400).json({
        message: `Cannot delete ${entry.status} entries`,
      });
    }

    // Audit log before deletion
    await createAuditLog({
      entityType: "Timesheet",
      entityId: entry._id,
      action: "delete",
      performedBy: userId,
      employee: employee._id,
      metadata: {
        project: entry.project,
        task: entry.task,
        hours: entry.hours,
      },
    });

    await entry.deleteOne();

    res.json({ message: "Timesheet entry deleted" });
  } catch (error) {
    console.error("Delete timesheet error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const { createNotification } = require("./notification.controller");

// ... existing code ...

// Submit Timesheets for Approval
exports.submitTimesheets = async (req, res) => {
  try {
    const { userId } = req.user;
    const { weekEnding } = req.body;

    // Populate reportingManager to notify them
    const employee = await Employee.findOne({ user: userId }).populate({
      path: "reportingManager",
      populate: { path: "user" },
    });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Find all draft timesheets for this week
    const weekEnd = new Date(weekEnding);
    const timesheets = await Timesheet.find({
      employee: employee._id,
      weekEnding: weekEnd,
      status: "draft",
    });

    if (timesheets.length === 0) {
      return res
        .status(400)
        .json({ message: "No draft timesheets found for this week" });
    }

    // Update all to submitted
    await Timesheet.updateMany(
      {
        employee: employee._id,
        weekEnding: weekEnd,
        status: "draft",
      },
      {
        status: "submitted",
        submittedAt: new Date(),
      }
    );

    // Trigger Notification to Manager
    if (employee.reportingManager && employee.reportingManager.user) {
      await createNotification({
        recipient: employee.reportingManager.user._id,
        type: "TIMESHEET",
        title: "Timesheet Submitted",
        message: `${employee.firstName} ${
          employee.lastName
        } has submitted timesheets for week ending ${weekEnd.toLocaleDateString()}.`,
        relatedId: timesheets[0]._id, // Link to one of them or generic?
      });
    }

    // Audit log for submission
    for (const timesheet of timesheets) {
      await createAuditLog({
        entityType: "Timesheet",
        entityId: timesheet._id,
        action: "submit",
        performedBy: userId,
        employee: employee._id,
        metadata: {
          weekEnding: weekEnd,
          project: timesheet.project,
          hours: timesheet.hours,
        },
      });
    }

    res.json({
      message: `${timesheets.length} timesheet(s) submitted for approval`,
      count: timesheets.length,
    });
  } catch (error) {
    console.error("Submit timesheets error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Pending Timesheet Approvals (for managers)
exports.getPendingApprovals = async (req, res) => {
  try {
    const { userId } = req.user;

    // Find manager's employee record
    const managerEmployee = await Employee.findOne({ user: userId });
    if (!managerEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Find all employees reporting to this manager
    const reportingEmployees = await Employee.find({
      reportingManager: managerEmployee._id,
    }).select("_id");

    const employeeIds = reportingEmployees.map((e) => e._id);

    // Get submitted timesheets from these employees
    const pendingTimesheets = await Timesheet.find({
      employee: { $in: employeeIds },
      status: "submitted",
    })
      .populate("employee", "firstName lastName employeeId")
      .sort({ submittedAt: -1 });

    res.json({ timesheets: pendingTimesheets });
  } catch (error) {
    console.error("Get pending approvals error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Approve Timesheet
exports.approveTimesheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { comments } = req.body;

    const timesheet = await Timesheet.findById(id);
    if (!timesheet) {
      return res.status(404).json({ message: "Timesheet not found" });
    }

    if (timesheet.status !== "submitted") {
      return res
        .status(400)
        .json({ message: "Timesheet is not submitted for approval" });
    }

    timesheet.status = "approved";
    timesheet.reviewedBy = userId;
    timesheet.reviewedAt = new Date();
    timesheet.reviewComments = comments || "";
    await timesheet.save();

    // Audit log
    await createAuditLog({
      entityType: "Timesheet",
      entityId: timesheet._id,
      action: "approve",
      performedBy: userId,
      employee: timesheet.employee,
      metadata: {
        project: timesheet.project,
        hours: timesheet.hours,
        comments,
      },
    });

    res.json({
      message: "Timesheet approved successfully",
      timesheet,
    });
  } catch (error) {
    console.error("Approve timesheet error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Reject Timesheet
exports.rejectTimesheet = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant context" });
    }

    const employee = await Employee.findOne({
      user: req.user.userId,
      tenantId,
    });
    const { id } = req.params;
    const { userId } = req.user;
    const { comments } = req.body;

    if (!comments) {
      return res
        .status(400)
        .json({ message: "Comments required for rejection" });
    }

    // Assuming 'status' is 'rejected' and 'rejectionReason' is 'comments' for this function
    // And 'approverId' is 'userId'
    const status = "rejected";
    const rejectionReason = comments;
    const approverId = userId;

    const timesheet = await Timesheet.findByIdAndUpdate(
      id,
      {
        status,
        rejectionReason: status === "rejected" ? rejectionReason : undefined,
        approvedBy: status === "approved" ? approverId : undefined, // This will be undefined for rejection
        approvedAt: status === "approved" ? new Date() : undefined, // This will be undefined for rejection
        reviewedBy: approverId, // Set reviewedBy for both approval/rejection
        reviewedAt: new Date(),
        reviewComments: rejectionReason, // Set reviewComments for rejection
      },
      { new: true }
    ).populate({
      path: "employee",
      populate: { path: "user" }, // Nested populate to get User ID
    });

    if (!timesheet) {
      return res.status(404).json({ message: "Timesheet not found" });
    }

    // Trigger Notification
    if (status === "approved" || status === "rejected") {
      if (timesheet.employee && timesheet.employee.user) {
        await createNotification({
          recipient: timesheet.employee.user._id,
          type: "TIMESHEET",
          title: `Timesheet ${status === "approved" ? "Approved" : "Rejected"}`,
          message: `Your timesheet for week ending ${new Date(
            timesheet.weekEnding
          ).toLocaleDateString()} has been ${
            status === "approved" ? "approved" : "rejected"
          }.`,
          relatedId: timesheet._id,
        });
      }
    }

    // Audit log
    await createAuditLog({
      entityType: "Timesheet",
      entityId: timesheet._id,
      action: "reject", // Action remains 'reject' for this function
      performedBy: userId,
      employee: timesheet.employee,
      metadata: {
        project: timesheet.project,
        hours: timesheet.hours,
        comments: rejectionReason, // Use rejectionReason for comments
      },
    });

    res.json({
      message: "Timesheet rejected",
      timesheet,
    });
  } catch (error) {
    console.error("Reject timesheet error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
