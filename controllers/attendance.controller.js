const mongoose = require("mongoose");
const TimeEntry = require("../models/TimeEntry");
const Employee = require("../models/Employee");
const { createAuditLog } = require("../utils/auditLogger");

// Clock In
exports.clockIn = async (req, res) => {
  try {
    const { userId } = req.user;

    // Find employee by user ID
    const employee = await Employee.findOne({ user: userId });
    if (!employee) {
      return res.status(404).json({
        message:
          "Employee profile not found. Please contact HR to create your employee profile before using attendance tracking.",
      });
    }

    // Check if already clocked in
    const activeEntry = await TimeEntry.findOne({
      employee: employee._id,
      status: "active",
    });

    if (activeEntry) {
      return res.status(400).json({ message: "Already clocked in" });
    }

    // Create new time entry
    const timeEntry = new TimeEntry({
      employee: employee._id,
      clockIn: new Date(),
      status: "active",
    });

    await timeEntry.save();

    // Audit log
    await createAuditLog({
      entityType: "TimeEntry",
      entityId: timeEntry._id,
      action: "create",
      performedBy: userId,
      employee: employee._id,
      metadata: { action: "clock_in", clockIn: timeEntry.clockIn },
    });

    res.status(201).json({
      message: "Clocked in successfully",
      timeEntry,
    });
  } catch (error) {
    console.error("Clock in error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Clock Out
exports.clockOut = async (req, res) => {
  try {
    const { userId } = req.user;

    const employee = await Employee.findOne({ user: userId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Find active time entry
    const timeEntry = await TimeEntry.findOne({
      employee: employee._id,
      status: "active",
    });

    if (!timeEntry) {
      return res.status(400).json({ message: "No active clock-in found" });
    }

    // Update time entry
    timeEntry.clockOut = new Date();
    timeEntry.status = "completed";
    await timeEntry.save(); // Pre-save hook will calculate totalHours

    // Audit log
    await createAuditLog({
      entityType: "TimeEntry",
      entityId: timeEntry._id,
      action: "update",
      performedBy: userId,
      employee: employee._id,
      changes: {
        old: { status: "active" },
        new: { status: "completed", clockOut: timeEntry.clockOut, totalHours: timeEntry.totalHours },
      },
      metadata: { action: "clock_out" },
    });

    res.json({
      message: "Clocked out successfully",
      timeEntry,
    });
  } catch (error) {
    console.error("Clock out error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Start Break
exports.startBreak = async (req, res) => {
  try {
    const { userId } = req.user;

    const employee = await Employee.findOne({ user: userId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const timeEntry = await TimeEntry.findOne({
      employee: employee._id,
      status: "active",
    });

    if (!timeEntry) {
      return res.status(400).json({ message: "No active clock-in found" });
    }

    // Check if already on break
    const activeBreak = timeEntry.breaks.find(
      (b) => b.breakStart && !b.breakEnd
    );
    if (activeBreak) {
      return res.status(400).json({ message: "Already on break" });
    }

    // Add new break
    timeEntry.breaks.push({ breakStart: new Date() });
    await timeEntry.save();

    res.json({
      message: "Break started",
      timeEntry,
    });
  } catch (error) {
    console.error("Start break error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// End Break
exports.endBreak = async (req, res) => {
  try {
    const { userId } = req.user;

    const employee = await Employee.findOne({ user: userId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const timeEntry = await TimeEntry.findOne({
      employee: employee._id,
      status: "active",
    });

    if (!timeEntry) {
      return res.status(400).json({ message: "No active clock-in found" });
    }

    // Find active break
    const activeBreak = timeEntry.breaks.find(
      (b) => b.breakStart && !b.breakEnd
    );
    if (!activeBreak) {
      return res.status(400).json({ message: "No active break found" });
    }

    activeBreak.breakEnd = new Date();
    await timeEntry.save();

    res.json({
      message: "Break ended",
      timeEntry,
    });
  } catch (error) {
    console.error("End break error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Current Status
exports.getStatus = async (req, res) => {
  try {
    const { userId } = req.user;

    const employee = await Employee.findOne({ user: userId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const activeEntry = await TimeEntry.findOne({
      employee: employee._id,
      status: "active",
    });

    if (!activeEntry) {
      return res.json({ status: "clocked-out", timeEntry: null });
    }

    // Check if on break
    const activeBreak = activeEntry.breaks.find(
      (b) => b.breakStart && !b.breakEnd
    );

    res.json({
      status: activeBreak ? "on-break" : "clocked-in",
      timeEntry: activeEntry,
    });
  } catch (error) {
    console.error("Get status error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Time Entry History
exports.getHistory = async (req, res) => {
  try {
    const { userId } = req.user;
    const { startDate, endDate, limit = 30 } = req.query;

    const employee = await Employee.findOne({ user: userId });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const query = { employee: employee._id };

    if (startDate || endDate) {
      query.clockIn = {};
      if (startDate) query.clockIn.$gte = new Date(startDate);
      if (endDate) query.clockIn.$lte = new Date(endDate);
    }

    const entries = await TimeEntry.find(query)
      .sort({ clockIn: -1 })
      .limit(parseInt(limit));

    res.json({ entries });
  } catch (error) {
    console.error("Get history error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get Team Status (for PM dashboard)
exports.getTeamStatus = async (req, res) => {
  try {
    const { userId } = req.user;

    // Find the current user's employee record
    const managerEmployee = await Employee.findOne({ user: userId });
    if (!managerEmployee) {
      return res.status(404).json({ message: "Employee profile not found" });
    }

    // Get only employees who report to this manager
    const employees = await Employee.find({
      reportingManager: managerEmployee._id,
    })
      .select("firstName lastName employeeId role")
      .lean();

    const teamStatus = await Promise.all(
      employees.map(async (employee) => {
        const activeEntry = await TimeEntry.findOne({
          employee: employee._id,
          status: "active",
        });

        let status = "clocked-out";
        let clockInTime = null;

        if (activeEntry) {
          // Check if on break
          const activeBreak = activeEntry.breaks.find(
            (b) => b.breakStart && !b.breakEnd
          );
          status = activeBreak ? "on-break" : "clocked-in";
          clockInTime = activeEntry.clockIn;
        }

        return {
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`,
          role: employee.role,
          status,
          clockInTime,
        };
      })
    );

    res.json({ teamStatus });
  } catch (error) {
    console.error("Get team status error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
