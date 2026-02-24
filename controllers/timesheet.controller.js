const Timesheet = require("../models/Timesheet");
const Employee = require("../models/Employee");
const TimeEntry = require("../models/TimeEntry");
const { createAuditLog } = require("../utils/auditLogger");
const Role = require("../models/Role");
const User = require("../models/User");

const Leave = require("../models/Leave");

// Create Timesheet Entry
exports.createEntry = async (req, res) => {
  try {
    const { userId } = req.user;
    const { date, project, task, startTime, endTime, description } = req.body;

    const employee = await Employee.findOne({ user: userId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Check for approved leave on the entry date
    const entryDateObj = new Date(date);
    const startOfDay = new Date(entryDateObj);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(entryDateObj);
    endOfDay.setHours(23, 59, 59, 999);

    const activeLeave = await Leave.findOne({
      employee: employee._id,
      status: "Approved",
      startDate: { $lte: endOfDay },
      endDate: { $gte: startOfDay },
    });

    if (activeLeave) {
      return res.status(400).json({
        message:
          "Cannot create timesheet entry for a day marked as approved leave.",
      });
    }

    // Calculate week ending date (Sunday)
    const entryDate = new Date(date);
    const dayOfWeek = entryDate.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const weekEnding = new Date(entryDate);
    weekEnding.setDate(entryDate.getDate() + daysUntilSunday);

    const timesheetEntry = new Timesheet({
      employee: employee._id,
      tenantId: req.user.tenantId, // Add tenantId
      date,
      project,
      task,
      startTime,
      endTime,
      description,
      weekEnding,
      entryType: "manual", // Explicitly set manual type
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

    if (req.query.entryType) {
      query.entryType = req.query.entryType;
    }

    if (req.query.projectId) {
      query.projectId = req.query.projectId;
    }

    if (req.query.clientId) {
      // Find projects for this client
      const Project = require("../models/Project");
      const clientProjects = await Project.find({
        client: req.query.clientId, // Assuming client ID is passed, but Project model stores client name as String currently on line 16 of Project.js?
        // Wait, Project.js line 16 says `client: String`.
        // Client.js is a separate model.
        // If Project stores client name, we might need to filter by name or if client is referenced.
        // Let's check Project.js again.
      }).select("_id");

      // The user wants to filter by Client.
      // In Project.js: client: String.
      // In Client.js: name: String.
      // So Project.client likely stores the Client Name, not ID.
      // If the frontend passes Client ID, we need to find the Client Name first OR find projects by Client Name.
      // Let's assume frontend passes Client Name for now if Project stores String.
      // BUT, looking at Client.js, it seems we have a Client model.
      // Ideally Project should ref Client. But it says String.
      // Let's assume for now we filter Projects where client field matches.

      // Re-reading Project.js content from Step 15: `client: String`.
      // If I want to filter by "Client", I should probably filter by the client name stored in Project.

      // Wait, if I change the input to be client name?
      // "client: req.query.client" -> query.projectId = { $in: ... }
    }

    // Let's stick to what's safer.
    if (req.query.client) {
      const Project = require("../models/Project");
      // If client is passed as name
      const projects = await Project.find({ client: req.query.client }).select(
        "_id",
      );
      const projectIds = projects.map((p) => p._id);

      if (query.projectId) {
        // Intersection if projectId also provided? simpler to just override or use $in
        // If both, we want intersection.
        query.projectId = {
          $in: projectIds.filter((id) => id.toString() === query.projectId),
        };
      } else {
        query.projectId = { $in: projectIds };
      }
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

    // Don't allow updating approved entries
    if (entry.status === "approved") {
      return res.status(400).json({
        message: `Cannot update approved entries`,
      });
    }

    const oldValues = { ...entry.toObject() };
    Object.assign(entry, updates);

    // If entry was submitted or rejected, reset to draft on edit so it can be re-submitted
    if (entry.status === "submitted" || entry.status === "rejected") {
      entry.status = "draft";
      entry.submittedAt = undefined;
      entry.rejectionReason = undefined;
    }

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

    // Find all draft timesheets (submit ALL drafts)
    const timesheets = await Timesheet.find({
      employee: employee._id,
      status: "draft",
    });

    if (timesheets.length === 0) {
      return res.status(400).json({ message: "No draft timesheets found" });
    }

    // Update all to submitted
    await Timesheet.updateMany(
      {
        employee: employee._id,
        status: "draft",
      },
      {
        status: "submitted",
        submittedAt: new Date(),
      },
    );

    // Trigger Notification to Manager
    if (employee.reportingManager && employee.reportingManager.user) {
      await createNotification({
        recipient: employee.reportingManager.user._id,
        type: "TIMESHEET",
        title: "Timesheet Submitted",
        message: `${employee.firstName} ${
          employee.lastName
        } has submitted ${timesheets.length} timesheet entry/entries.`,
        relatedId: timesheets[0]._id, // Link to one of them or generic?
        tenantId: req.user.tenantId,
      });
    }

    // Trigger Notification to HR/Admin
    const hrRoles = await Role.find({
      name: { $in: ["HR", "Admin"] },
      tenantId: req.user.tenantId,
    });
    const hrRoleIds = hrRoles.map((r) => r._id);
    const hrUsers = await User.find({
      roles: { $in: hrRoleIds },
      tenantId: req.user.tenantId,
    });

    for (const hrUser of hrUsers) {
      await createNotification({
        recipient: hrUser._id,
        type: "TIMESHEET",
        title: "Timesheet Submitted (HR Review)",
        message: `${employee.firstName} ${
          employee.lastName
        } has submitted ${timesheets.length} timesheet entry/entries.`,
        relatedId: timesheets[0]._id,
        tenantId: req.user.tenantId,
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
          weekEnding: timesheet.weekEnding,
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

// Get Pending Timesheet Approvals (for managers or HR)
exports.getPendingApprovals = async (req, res) => {
  try {
    const { userId } = req.user;
    const tenantId = req.user.tenantId;

    const user = await User.findById(userId).populate("roles");
    const userRoles = user?.roles.map((r) => r.name) || [];
    const isHR =
      userRoles.includes("HR") ||
      userRoles.includes("Admin") ||
      user.isCompanyAdmin;

    let pendingTimesheets = [];

    if (isHR) {
      // HR sees all pending timesheets in tenant
      // We first find all employees in tenant
      const tenantEmployees = await Employee.find({ tenantId }).select("_id");
      const employeeIds = tenantEmployees.map((e) => e._id);

      pendingTimesheets = await Timesheet.find({
        employee: { $in: employeeIds },
        status: "submitted",
      })
        .populate("employee", "firstName lastName employeeId")
        .sort({ submittedAt: -1 });
    } else {
      // Find manager's employee record
      const managerEmployee = await Employee.findOne({ user: userId });
      if (!managerEmployee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Find all employees reporting to this manager
      const reportingEmployees = await Employee.find({
        reportingManager: managerEmployee._id,
        tenantId,
      }).select("_id");

      const employeeIds = reportingEmployees.map((e) => e._id);

      // Get submitted timesheets from these employees
      pendingTimesheets = await Timesheet.find({
        employee: { $in: employeeIds },
        status: "submitted",
      })
        .populate("employee", "firstName lastName employeeId")
        .sort({ submittedAt: -1 });
    }

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
      { new: true },
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
            timesheet.weekEnding,
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
// Merge Timesheet Entries
exports.mergeEntries = async (req, res) => {
  try {
    const { userId } = req.user;
    const {
      entryIds,
      project,
      projectId,
      task,
      taskId,
      description,
      startTime,
      endTime,
      date,
    } = req.body;

    if (!Array.isArray(entryIds) || entryIds.length < 2) {
      return res
        .status(400)
        .json({ message: "At least two entries are required to merge." });
    }

    const employee = await Employee.findOne({ user: userId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Find all entries to verify ownership and status
    const entries = await Timesheet.find({
      _id: { $in: entryIds },
      employee: employee._id,
    });

    if (entries.length !== entryIds.length) {
      return res.status(400).json({
        message: "One or more entries not found or do not belong to you.",
      });
    }

    // Ensure all are drafts
    const nonDrafts = entries.filter((e) => e.status !== "draft");
    if (nonDrafts.length > 0) {
      return res
        .status(400)
        .json({ message: "Only draft entries can be merged." });
    }

    // Calculate total hours
    const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);

    // Default Date to date of first entry if not provided
    const mergeDate = date || entries[0].date;

    // Calculate Week Ending
    const entryDate = new Date(mergeDate);
    const dayOfWeek = entryDate.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const weekEnding = new Date(entryDate);
    weekEnding.setDate(entryDate.getDate() + daysUntilSunday);

    // Create New Merged Entry
    const newEntry = new Timesheet({
      employee: employee._id,
      tenantId: req.user.tenantId,
      date: mergeDate,
      project,
      projectId,
      task,
      taskId,
      startTime, // User defined start time of the block
      endTime, // User defined end time of the block
      hours: totalHours, // Sum of hours
      description: description || "Merged Entry",
      weekEnding,
      status: "draft",
    });

    await newEntry.save();

    // Delete old entries
    await Timesheet.deleteMany({ _id: { $in: entryIds } });

    // Audit Log
    await createAuditLog({
      entityType: "Timesheet",
      entityId: newEntry._id,
      action: "create", // Technically a create via merge
      performedBy: userId,
      employee: employee._id,
      metadata: {
        action: "merge",
        originalEntryIds: entryIds,
        hours: totalHours,
      },
    });

    res.status(201).json({
      message: "Entries merged successfully",
      entry: newEntry,
    });
  } catch (error) {
    console.error("Merge entries error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Clock In (Start Timer)
exports.clockIn = async (req, res) => {
  try {
    const { userId } = req.user;
    const { project, projectId, task, taskId, description } = req.body;

    const employee = await Employee.findOne({ user: userId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Check if there is already an active timer
    const activeTimer = await TimeEntry.findOne({
      employee: employee._id,
      clockOut: null,
      status: "active",
    });

    if (activeTimer) {
      return res.status(400).json({
        message: "You already have an active timer running.",
        activeTimer,
      });
    }

    const newTimeEntry = new TimeEntry({
      employee: employee._id,
      tenantId: req.user.tenantId,
      clockIn: new Date(),
      status: "active",
      project,
      projectId,
      task,
      taskId,
      description,
    });

    await newTimeEntry.save();

    res.status(201).json({
      message: "Clocked in successfully",
      entry: newTimeEntry,
    });
  } catch (error) {
    console.error("Clock in error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Clock Out (Stop Timer)
exports.clockOut = async (req, res) => {
  try {
    const { userId } = req.user;
    const { description } = req.body; // Allow updating description on clock out

    const employee = await Employee.findOne({ user: userId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Find active timer
    const activeTimer = await TimeEntry.findOne({
      employee: employee._id,
      clockOut: null,
      status: "active",
    });

    if (!activeTimer) {
      return res.status(404).json({ message: "No active timer found." });
    }

    const clockOutTime = new Date();

    // Update TimeEntry
    activeTimer.clockOut = clockOutTime;
    activeTimer.status = "completed";
    if (description) {
      activeTimer.description = description; // Update description if provided
    }
    await activeTimer.save();

    // Create Timesheet Entry from this
    const formatTime = (date) => {
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    };

    const startTimeStr = formatTime(activeTimer.clockIn);
    const endTimeStr = formatTime(clockOutTime);

    // Calculate Week Ending
    const entryDate = new Date(activeTimer.clockIn);
    const dayOfWeek = entryDate.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const weekEnding = new Date(entryDate);
    weekEnding.setDate(entryDate.getDate() + daysUntilSunday);

    // If activeTimer has missing project/task strings, try to populate them
    let projectStr = activeTimer.project;
    let taskStr = activeTimer.task;

    if (!projectStr && activeTimer.projectId) {
      const Project = require("../models/Project");
      const proj = await Project.findById(activeTimer.projectId);
      if (proj) projectStr = proj.name;
    }
    if (!taskStr && activeTimer.taskId) {
      const Task = require("../models/Task");
      const tsk = await Task.findById(activeTimer.taskId);
      if (tsk) taskStr = tsk.title;
    }

    // Default fallback if still missing
    if (!projectStr) projectStr = "Unknown Project";
    if (!taskStr) taskStr = "General";

    const timesheetEntry = new Timesheet({
      employee: employee._id,
      tenantId: req.user.tenantId,
      date: activeTimer.clockIn, // Use clock-in date
      project: projectStr,
      projectId: activeTimer.projectId,
      task: taskStr,
      taskId: activeTimer.taskId,
      startTime: startTimeStr,
      endTime: endTimeStr,
      description: activeTimer.description,
      entryType: "timer",
      weekEnding,
    });

    await timesheetEntry.save();

    res.json({
      message: "Clocked out successfully",
      timeEntry: activeTimer,
      timesheetEntry,
    });
  } catch (error) {
    console.error("Clock out error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Active Timer
exports.getActiveTimer = async (req, res) => {
  try {
    const { userId } = req.user;
    const employee = await Employee.findOne({ user: userId });

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const activeTimer = await TimeEntry.findOne({
      employee: employee._id,
      clockOut: null,
      status: "active",
    });

    res.json({ activeTimer });
  } catch (error) {
    console.error("Get active timer error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
